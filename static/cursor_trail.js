/* global THREE */
(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dispose;
  let generation = 0;

  async function start() {
    const current = ++generation;
    dispose?.();
    dispose = undefined;
    if (motion.matches || typeof THREE === "undefined") return;

    let renderer;
    let geometry;
    let material;
    let buffers = [];
    let frame;
    const listeners = new AbortController();
    const cleanup = () => {
      listeners.abort();
      cancelAnimationFrame(frame);
      buffers.forEach((buffer) => buffer.dispose());
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
    dispose = cleanup;

    try {
      const shaders = await Promise.all(
        ["/cursor_trail_vertex.glsl", "/cursor_trail_fragment.glsl"].map(
          async (url) => {
            const response = await fetch(url, { signal: listeners.signal });
            if (!response.ok)
              throw new Error(
                `Unable to load background shader: ${response.status}`,
              );
            return response.text();
          },
        ),
      );
      if (current !== generation) return;

      const camera = new THREE.Camera();
      camera.position.z = 1;
      const scene = new THREE.Scene();
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const target = new THREE.Vector2(coarse ? -10 : 0, coarse ? -10 : 0);
      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_buffer: { value: null },
        u_mouse: { value: target.clone() },
        u_touch: { value: coarse },
        u_renderpass: { value: false },
      };
      geometry = new THREE.PlaneBufferGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaders[0],
        fragmentShader: shaders[1],
      });
      material.extensions.derivatives = true;
      scene.add(new THREE.Mesh(geometry, material));
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
      // High-density phones need motion, not a native-resolution framebuffer.
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5),
      );
      renderer.domElement.className = "portfolio-trail";
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.pointerEvents = "none";
      document.body.prepend(renderer.domElement);

      let width;
      let height;
      function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        renderer.setSize(width, height);
        buffers.forEach((buffer) => buffer.dispose());
        buffers = [0, 1].map(
          () =>
            new THREE.WebGLRenderTarget(
              Math.max(1, Math.round(width / 5)),
              Math.max(1, Math.round(height / 5)),
            ),
        );
        uniforms.u_buffer.value = buffers[1].texture;
      }
      resize();

      function point(event) {
        // Viewport coordinates keep the trail under the finger after page scrolling.
        target.set(
          (event.clientX - width / 2) / height,
          -(event.clientY - height / 2) / height,
        );
      }
      function release() {
        if (!coarse) return;
        // Keep the fading trail, but stop painting once the finger lifts.
        target.set(-10, -10);
        uniforms.u_mouse.value.copy(target);
      }
      const options = { passive: true, signal: listeners.signal };
      document.addEventListener("pointerup", release, options);
      document.addEventListener("touchend", release, options);
      document.addEventListener("touchcancel", release, options);
      document.addEventListener("pointerdown", point, options);
      document.addEventListener("pointermove", point, options);
      // Browsers cancel pointer events when native scrolling takes over.
      document.addEventListener(
        "touchmove",
        (event) => {
          if (event.touches[0]) point(event.touches[0]);
        },
        options,
      );
      window.addEventListener("resize", resize, options);
      renderer.domElement.addEventListener(
        "webglcontextlost",
        cleanup,
        options,
      );

      let previous = 0;
      function animate(time) {
        frame = requestAnimationFrame(animate);
        if (time - previous < (coarse ? 1000 / 30 : 1000 / 60)) return;
        previous = time;
        uniforms.u_mouse.value.lerp(target, 0.2);
        uniforms.u_time.value = time * 0.0005;
        uniforms.u_resolution.value.set(buffers[0].width, buffers[0].height);
        uniforms.u_renderpass.value = true;
        uniforms.u_buffer.value = buffers[1].texture;
        // Three r88 selects the target through render's third argument.
        renderer.render(scene, camera, buffers[0], true);
        buffers.reverse();
        uniforms.u_buffer.value = buffers[1].texture;
        uniforms.u_renderpass.value = false;
        uniforms.u_resolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height,
        );
        renderer.render(scene, camera);
      }
      function resume() {
        cancelAnimationFrame(frame);
        if (!document.hidden) frame = requestAnimationFrame(animate);
      }
      document.addEventListener("visibilitychange", resume, options);
      resume();
    } catch (error) {
      cleanup();
      if (error.name !== "AbortError")
        console.warn(
          "Background animation unavailable; using static texture.",
          error,
        );
    }
  }

  motion.addEventListener("change", start);
  window.addEventListener("pagehide", () => {
    ++generation;
    dispose?.();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) start();
  });
  start();
})();
