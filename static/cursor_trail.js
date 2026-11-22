/* global THREE */
(() => {
  const assets = new URL(".", document.currentScript?.src || document.baseURI);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dispose;
  let generation = 0;

  async function start() {
    const current = ++generation;
    dispose?.();
    let renderer;
    let geometry;
    let material;
    let buffers = [];
    let frame = 0;
    let resizeTimer;
    const listeners = new AbortController();
    const cleanup = () => {
      listeners.abort();
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      frame = 0;
      buffers.forEach((buffer) => buffer.dispose());
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      document.body.classList.remove("portfolio-static");
    };
    dispose = cleanup;
    const fallback = () => {
      cleanup();
      document.body.style.setProperty(
        "--shader-grain",
        `url("${new URL("shader-grain.png", assets).href}")`,
      );
      document.body.classList.add("portfolio-static");
    };
    if (typeof THREE === "undefined") return fallback();

    try {
      const shaders = await Promise.all(
        ["/cursor_trail_vertex.glsl", "/cursor_trail_fragment.glsl"].map(
          async (url) => {
            const response = await fetch(new URL(url.slice(1), assets), {
              signal: listeners.signal,
            });
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
      const target = new THREE.Vector2();
      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_buffer: { value: null },
        u_mouse: { value: target.clone() },
        u_touch: { value: coarse },
        u_paint: { value: false },
        u_static: { value: motion.matches },
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
      renderer.domElement.className = "portfolio-trail";
      renderer.domElement.setAttribute("aria-hidden", "true");
      Object.assign(renderer.domElement.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
      document.body.prepend(renderer.domElement);

      let width = 0;
      let height = 0;
      let paintingUntil = 0;
      let settlingUntil = 0;
      let previous = 0;

      function draw(time, feedback = true) {
        uniforms.u_time.value = time * 0.0005;
        if (feedback) {
          uniforms.u_resolution.value.set(buffers[0].width, buffers[0].height);
          uniforms.u_renderpass.value = true;
          uniforms.u_buffer.value = buffers[1].texture;
          // Three r88 selects the target through render's third argument.
          renderer.render(scene, camera, buffers[0], true);
          buffers.reverse();
        }
        uniforms.u_buffer.value = buffers[1].texture;
        uniforms.u_renderpass.value = false;
        uniforms.u_resolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height,
        );
        renderer.render(scene, camera);
      }

      function animate(time) {
        frame = 0;
        if (document.hidden || motion.matches) return;
        if (time - previous >= 1000 / (coarse ? 30 : 60)) {
          previous = time;
          uniforms.u_mouse.value.lerp(target, 0.2);
          uniforms.u_paint.value = time < paintingUntil;
          draw(time);
        }
        // Keep the last shader frame on screen; idle pages need no GPU work.
        if (time < settlingUntil) frame = requestAnimationFrame(animate);
      }
      function wake() {
        if (!frame && !document.hidden && !motion.matches)
          frame = requestAnimationFrame(animate);
      }

      function resize(force = false) {
        const nextWidth = window.innerWidth;
        const nextHeight = window.innerHeight;
        // Android's browser chrome changes height repeatedly during scrolling.
        // Stretch the existing canvas for these small changes; real layout and
        // orientation changes still resize the backing stores after coalescing.
        if (
          !force &&
          nextWidth === width &&
          (nextHeight === height ||
            (coarse &&
              Math.abs(nextHeight - height) < Math.max(120, height * 0.2)))
        )
          return;
        width = nextWidth;
        height = nextHeight;
        // Use the same CSS-pixel grain on phones and desktop, with a bounded
        // framebuffer on very large screens rather than multiplying by DPR.
        const pixelRatio = Math.min(1, Math.sqrt(1500000 / (width * height)));
        renderer.setSize(
          Math.round(width * pixelRatio),
          Math.round(height * pixelRatio),
          false,
        );
        const bufferWidth = Math.max(1, Math.round(width / 5));
        const bufferHeight = Math.max(1, Math.round(height / 5));
        if (!buffers.length)
          buffers = [0, 1].map(
            () => new THREE.WebGLRenderTarget(bufferWidth, bufferHeight),
          );
        else
          buffers.forEach((buffer) =>
            buffer.setSize(bufferWidth, bufferHeight),
          );
        uniforms.u_buffer.value = buffers[1].texture;
        draw(uniforms.u_time.value * 2000, false);
      }
      resize(true);

      function point(event) {
        if (motion.matches) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const x =
          ((event.clientX / rect.width - 0.5) * renderer.domElement.width) /
          renderer.domElement.height;
        const y = 0.5 - event.clientY / rect.height;
        if (uniforms.u_paint.value && target.x === x && target.y === y) return;
        target.set(x, y);
        if (!uniforms.u_paint.value) uniforms.u_mouse.value.copy(target);
        const time = performance.now();
        paintingUntil = time + 120;
        settlingUntil = time + 3000;
        wake();
      }
      function release() {
        if (!coarse) return;
        // Stop emission without displacing the feedback field's sampling origin.
        paintingUntil = 0;
        uniforms.u_paint.value = false;
      }
      const options = { passive: true, signal: listeners.signal };
      document.addEventListener("pointerup", release, options);
      document.addEventListener("touchend", release, options);
      document.addEventListener("touchcancel", release, options);
      document.addEventListener("pointerdown", point, options);
      document.addEventListener("pointermove", point, options);
      // Native scrolling cancels pointer events but continues passive touchmove.
      document.addEventListener(
        "touchmove",
        (event) => {
          if (event.touches[0]) point(event.touches[0]);
        },
        options,
      );
      window.addEventListener(
        "resize",
        () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(resize, 120);
        },
        options,
      );
      renderer.domElement.addEventListener(
        "webglcontextlost",
        fallback,
        options,
      );
      document.addEventListener(
        "visibilitychange",
        () => {
          cancelAnimationFrame(frame);
          frame = 0;
          if (!document.hidden && performance.now() < settlingUntil) wake();
        },
        options,
      );
      motion.addEventListener(
        "change",
        () => {
          cancelAnimationFrame(frame);
          frame = 0;
          paintingUntil = 0;
          settlingUntil = 0;
          uniforms.u_paint.value = false;
          uniforms.u_static.value = motion.matches;
          draw(uniforms.u_time.value * 2000, false);
        },
        options,
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      fallback();
      console.warn(
        "Background animation unavailable; using a static shader frame.",
        error,
      );
    }
  }

  window.addEventListener("pagehide", () => {
    ++generation;
    dispose?.();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) start();
  });
  start();
})();
