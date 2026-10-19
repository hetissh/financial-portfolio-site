// Presents the editable card, illustrative financial dashboard, and research handoff.
'use client';
import { useEffect, useRef } from 'react';
import styles from './CardJourney.module.css';

type Copy = {
  title: string;
  description: string;
  researchLead: string;
  researchAccent: string;
};
const formulas = [
  '=SUM(B2:B12)',
  '=AVERAGE(C4:C18)',
  '=IF(D8>0,"GROWTH","REVIEW")',
  '=XLOOKUP(A7,MARKETS,VALUE)',
  '=ROUND(E12/F12,2)',
];
const bars = [26, 34, 31, 45, 51, 47, 63, 67, 78, 96];
const cash = [33, 21, 42, 28, 46, 35, 51, 42, 57, 65];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const reveal = (a: number, b: number, progress: number) => clamp((progress - a) / (b - a));

export function CardJourney({ copy, monogram }: { copy: Copy; monogram: string }) {
  const journey = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dashboard = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const formula = useRef<HTMLSpanElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = journey.current;
    const panel = stage.current;
    const drawing = canvas.current;
    const board = dashboard.current;
    const heading = hero.current;
    const handoff = intro.current;
    if (!root || !panel || !drawing || !board || !heading || !handoff) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let disposed = false;
    let frame = 0;
    let progress = 0;
    let pointerX = 0;
    let pointerY = 0;
    let resizeObserver: ResizeObserver | undefined;
    let cleanupMotion = () => {};
    let cleanupThree = () => {};

    // The DOM fallback stays visible until WebGL has rendered its first frame.
    async function start() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const motion = { value: 0 };
      const tween = gsap.to(motion, {
        value: 1,
        ease: 'none',
        onUpdate: () => {
          progress = motion.value;
          const heroOut = reveal(0.12, 0.28, progress);
          heading!.style.opacity = String(1 - heroOut);
          heading!.style.transform = `translate(-50%, ${-42 * heroOut}px)`;
          cue.current?.style.setProperty('opacity', String(1 - reveal(0.08, 0.23, progress)));
          drawing!.style.opacity = String(1 - reveal(0.32, 0.51, progress));
          fallback.current?.style.setProperty('opacity', String(1 - reveal(0.32, 0.51, progress)));
          const intoBoard = reveal(0.25, 0.44, progress);
          const outBoard = reveal(0.77, 0.94, progress);
          board!.style.opacity = String(intoBoard * (1 - 0.83 * outBoard));
          board!.style.transform = `translate(-50%, ${60 * (1 - intoBoard) - 28 * outBoard}px) scale(${0.94 + 0.06 * intoBoard - 0.045 * outBoard})`;
          board!.style.filter = `blur(${8 * outBoard}px)`;
          board!.querySelectorAll<HTMLElement>('[data-metric]').forEach((element, index) => {
            const value = reveal(0.31 + index * 0.025, 0.43 + index * 0.025, progress);
            element.style.opacity = String(value);
            element.style.transform = `translateY(${18 * (1 - value)}px)`;
          });
          board!.querySelectorAll<HTMLElement>('[data-panel]').forEach((element, index) => {
            const value = reveal(0.38 + index * 0.035, 0.51 + index * 0.035, progress);
            element.style.opacity = String(value);
            element.style.transform = `translateY(${25 * (1 - value)}px)`;
          });
          board!.querySelectorAll<HTMLElement>('[data-bar]').forEach((element, index) => {
            const value = reveal(0.42 + index * 0.018, 0.6 + index * 0.018, progress);
            element.style.transform = `scaleY(${Math.max(0.001, value)})`;
          });
          board!.querySelectorAll<HTMLElement>('[data-cash]').forEach((element, index) => {
            element.style.transform = `scaleY(${Math.max(0.001, reveal(0.54 + index * 0.012, 0.7 + index * 0.012, progress))})`;
          });
          const ring = board!.querySelector<SVGCircleElement>('[data-ring]');
          if (ring) ring.style.strokeDasharray = `${427 * 0.58 * reveal(0.46, 0.69, progress)} 427`;
          const line = board!.querySelector<SVGPathElement>('[data-growth]');
          if (line) {
            const length = line.getTotalLength();
            line.style.strokeDasharray = String(length);
            line.style.strokeDashoffset = String(length * (1 - reveal(0.43, 0.72, progress)));
          }
          const researchIn = reveal(0.8, 0.95, progress);
          handoff!.style.opacity = String(researchIn);
          handoff!.style.transform = `translateY(${42 * (1 - researchIn)}px)`;
          grid.current?.style.setProperty(
            'opacity',
            String(1 - 0.7 * reveal(0.75, 0.96, progress)),
          );
          if (progress > 0.25) formula.current?.classList.remove(styles.formulaVisible);
        },
        scrollTrigger: {
          trigger: root!,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      });
      cleanupMotion = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
      const THREE = await import('three');
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({
        canvas: drawing!,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 1.9));
      const key = new THREE.PointLight(0xffffff, 70);
      key.position.set(-4, 4, 7);
      scene.add(key);
      const movingLight = new THREE.PointLight(0xffecc0, 55);
      movingLight.position.set(4, 2, 6);
      scene.add(movingLight);
      const rim = new THREE.DirectionalLight(0xffd638, 1.8);
      rim.position.set(5, -2, -6);
      scene.add(rim);
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 13;
      const shape = new THREE.Shape();
      const w = 5.8;
      const h = 3.65;
      const r = 0.34;
      shape.moveTo(-w / 2 + r, -h / 2);
      shape.lineTo(w / 2 - r, -h / 2);
      shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      shape.lineTo(w / 2, h / 2 - r);
      shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      shape.lineTo(-w / 2 + r, h / 2);
      shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      shape.lineTo(-w / 2, -h / 2 + r);
      shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.12,
          bevelEnabled: true,
          bevelThickness: 0.035,
          bevelSize: 0.035,
          bevelSegments: 3,
          curveSegments: 12,
        }),
        new THREE.MeshPhysicalMaterial({
          color: 0xdde1ec,
          metalness: 0.48,
          roughness: 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
        }),
      );
      body.position.z = -0.06;
      group.add(body);
      const faceGeometry = new THREE.PlaneGeometry(w, h);
      const textures = [false, true].map((reverse) => {
        const texture = new THREE.CanvasTexture(drawFace(copy.title, monogram, reverse));
        texture.colorSpace = THREE.SRGBColorSpace;
        const face = new THREE.Mesh(
          faceGeometry,
          new THREE.MeshPhysicalMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            metalness: 0.12,
            roughness: 0.23,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
            side: THREE.FrontSide,
          }),
        );
        face.position.z = reverse ? -0.105 : 0.105;
        if (reverse) face.rotation.y = Math.PI;
        group.add(face);
        return texture;
      });
      scene.add(group);
      const resize = () => {
        const width = panel!.clientWidth;
        const height = panel!.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(panel!);
      resize();
      const startAt = performance.now();
      const render = (now: number) => {
        if (disposed) return;
        if (!document.hidden) {
          const dock = reveal(0.17, 0.43, progress);
          const mobile = window.innerWidth < 800;
          const scale = mobile ? 0.55 : 0.92;
          group.scale.setScalar(scale * (1 - 0.55 * dock));
          group.position.x = (mobile ? -0.25 : -2.8) * dock;
          group.position.y = (mobile ? -0.78 : -1.11) + (mobile ? 0.4 : 1.48) * dock;
          group.rotation.y = -0.27 + (now - startAt) * 0.00017 + progress * 6.3 + pointerX * 0.27;
          group.rotation.x = -0.08 + pointerY * 0.17 + progress * 0.12;
          group.rotation.z = -0.055 + pointerX * 0.04;
          movingLight.position.x = 4 - pointerX * 5 - Math.sin(now * 0.0007) * 3;
          movingLight.position.y = 2 + pointerY * 2;
          renderer.render(scene, camera);
          panel!.dataset.threeReady = 'true';
        }
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
      cleanupThree = () => {
        resizeObserver?.disconnect();
        cancelAnimationFrame(frame);
        textures.forEach((texture) => texture.dispose());
        faceGeometry.dispose();
        body.geometry.dispose();
        (body.material as InstanceType<typeof THREE.MeshPhysicalMaterial>).dispose();
        group.children.slice(1).forEach((child) => {
          if (child instanceof THREE.Mesh) child.material.dispose();
        });
        renderer.dispose();
      };
    }
    start().catch(() => {
      // A flat, readable card remains in the page if WebGL is unavailable.
    });
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (0.5 - event.clientY / window.innerHeight) * 2;
    };
    panel.addEventListener('pointermove', move);
    return () => {
      disposed = true;
      panel.removeEventListener('pointermove', move);
      cleanupMotion();
      cleanupThree();
    };
  }, [copy.title, monogram]);

  function showFormula(event: React.PointerEvent<HTMLDivElement>) {
    const target = formula.current;
    const surface = grid.current;
    if (!target || !surface || event.pointerType === 'touch') return;
    const rect = surface.getBoundingClientRect();
    const cellWidth = window.innerWidth < 800 ? 148 : 188;
    const cellHeight = window.innerWidth < 800 ? 42 : 50;
    const col = Math.floor((event.clientX - rect.left) / cellWidth);
    const row = Math.floor((event.clientY - rect.top) / cellHeight);
    const cell = `${col}:${row}`;
    if (target.dataset.cell !== cell) {
      target.dataset.cell = cell;
      target.textContent = formulas[Math.floor(Math.random() * formulas.length)];
    }
    target.style.left = `${col * cellWidth}px`;
    target.style.top = `${row * cellHeight}px`;
    target.classList.add(styles.formulaVisible);
  }

  return (
    <section
      ref={journey}
      className={styles.journey}
      aria-label="Portfolio introduction and illustrative financial dashboard"
    >
      <div ref={stage} className={styles.stage}>
        <div
          ref={grid}
          data-testid="sheet-grid"
          className={styles.grid}
          onPointerMove={showFormula}
          onPointerLeave={() => formula.current?.classList.remove(styles.formulaVisible)}
          aria-hidden="true"
        >
          <span ref={formula} data-testid="sheet-formula" className={styles.formula} />
        </div>
        <div ref={hero} className={styles.hero}>
          <span className={styles.kicker}>FINANCE / RESEARCH / PERSPECTIVE</span>
          <h1 id="top" tabIndex={-1}>
            {copy.title}
          </h1>
          <span className={styles.heroRule} />
          <p>{copy.description}</p>
          <a className={styles.heroLink} href="#research">
            Explore my research ↗
          </a>
        </div>
        <div className={styles.halo} aria-hidden="true" />
        <div ref={fallback} className={styles.cardFallback} aria-hidden="true">
          <div className={styles.cardTop}>
            <span>{monogram} / RESEARCH</span>
            <span>{copy.title}</span>
          </div>
          <div className={styles.chip} />
          <div className={styles.cardPhrase}>Look closer.</div>
          <div className={styles.cardFoot}>
            BUSINESSES&nbsp; / &nbsp;MARKETS&nbsp; / &nbsp;IDEAS
          </div>
        </div>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <span ref={cue} className={styles.cue}>
          SCROLL TO EXPLORE ↓
        </span>
        <div
          ref={dashboard}
          data-testid="journey-dashboard"
          className={styles.dashboard}
          role="img"
          aria-label="Illustrative dashboard with rising bar graph, allocation ring, cash flow bars and market trend"
        >
          <div className={styles.dashboardShell}>
            <div className={styles.dashboardTop}>
              <span>PORTFOLIO / SIGNALS</span>
              <span>ILLUSTRATIVE DATA · MOTION STUDY</span>
              <span className={styles.lights}>● ● ●</span>
            </div>
            <div className={styles.metrics}>
              {[
                ['Growth', '+24.8%'],
                ['Allocation', '58 / 42'],
                ['Cash flow', '+18.2'],
                ['Momentum', '91%'],
              ].map(([label, value]) => (
                <div key={label} data-metric className={styles.metric}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className={styles.chartGrid}>
              <div data-panel className={`${styles.chart} ${styles.growth}`}>
                <div className={styles.chartHead}>
                  <span>01 / GROWTH TRAJECTORY</span>
                  <b>↗ 24.8%</b>
                </div>
                <div className={styles.bars}>
                  {bars.map((height, index) => (
                    <i key={index} data-bar style={{ height: `${height}%` }} />
                  ))}
                </div>
                <svg
                  className={styles.growthLine}
                  viewBox="0 0 600 230"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    data-growth
                    d="M20 188 C74 178 88 171 118 163 S175 150 198 140 S256 150 276 124 S337 117 360 94 S417 104 444 70 S506 78 531 48 S568 45 583 15"
                  />
                </svg>
              </div>
              <div data-panel className={`${styles.chart} ${styles.donut}`}>
                <div className={styles.chartHead}>
                  <span>02 / ALLOCATION</span>
                  <b>58% CORE</b>
                </div>
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle cx="100" cy="100" r="68" className={styles.ringTrack} />
                  <circle data-ring cx="100" cy="100" r="68" className={styles.ring} />
                </svg>
                <strong>58%</strong>
                <small>THREE CONNECTED SIGNALS</small>
              </div>
              <div data-panel className={`${styles.chart} ${styles.cashflow}`}>
                <div className={styles.chartHead}>
                  <span>03 / CASH FLOW RHYTHM</span>
                  <b>+18.2</b>
                </div>
                <div className={styles.cashColumns}>
                  {cash.map((height, index) => (
                    <span key={index}>
                      <i data-cash style={{ height: `${height}%` }} />
                      <i data-cash style={{ height: `${Math.max(7, 30 - height / 3)}%` }} />
                    </span>
                  ))}
                </div>
              </div>
              <div data-panel className={`${styles.chart} ${styles.trend}`}>
                <div className={styles.chartHead}>
                  <span>04 / SIGNAL STRENGTH</span>
                  <b>+12.6%</b>
                </div>
                <svg viewBox="0 0 400 170" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 151 C42 135 69 153 105 113 S167 132 201 87 S258 96 295 54 S355 72 396 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div ref={intro} data-testid="research-handoff" className={styles.researchIntro}>
          <div className={styles.paperGhost} aria-hidden="true">
            <span>THE RESEARCH DESK</span>
          </div>
          <div className={styles.researchCopy}>
            <span className={styles.researchKicker}>THE NOTEBOOK / 01</span>
            <h2>
              {copy.researchLead}
              <em>{copy.researchAccent}</em>
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

function drawFace(title: string, monogram: string, reverse: boolean) {
  const image = document.createElement('canvas');
  image.width = 1024;
  image.height = 644;
  const ctx = image.getContext('2d')!;
  ctx.beginPath();
  ctx.roundRect(3, 3, 1018, 638, 60);
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 1024, 644);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.22, '#eef2f8');
  base.addColorStop(0.48, '#ffffff');
  base.addColorStop(0.68, '#d8e0ee');
  base.addColorStop(1, '#f8faff');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 644);
  // Fine foil lines and a luminous diagonal band add sheen without obscuring the copy.
  for (let x = -640; x < 1600; x += 16) {
    ctx.strokeStyle = x % 48 === 0 ? '#ffffff62' : '#7487ae12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 644, 644);
    ctx.stroke();
  }
  const shine = ctx.createLinearGradient(130, 0, 800, 644);
  shine.addColorStop(0, '#ffffff00');
  shine.addColorStop(0.43, '#ffffff00');
  shine.addColorStop(0.5, '#ffffffa8');
  shine.addColorStop(0.57, '#ffffff00');
  shine.addColorStop(1, '#ffffff00');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, 1024, 644);
  ctx.strokeStyle = '#ffffffcf';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(13, 13, 998, 618, 52);
  ctx.stroke();
  ctx.fillStyle = '#10165b';
  if (reverse) {
    ctx.fillRect(0, 105, 1024, 116);
    ctx.font = '600 28px Arial, sans-serif';
    ctx.fillText('THE NOTEBOOK', 75, 75);
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText('A closer view of businesses and markets', 75, 285);
    ctx.strokeStyle = '#20b985';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(80, 495);
    [230, 365, 510, 655, 800, 945].forEach((x, index) =>
      ctx.lineTo(x, [457, 466, 393, 415, 338, 315][index]),
    );
    ctx.stroke();
    ctx.fillStyle = '#e3bc20';
    ctx.beginPath();
    ctx.arc(945, 315, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26346c';
    ctx.font = '21px Arial, sans-serif';
    ctx.fillText('RESEARCH  /  PERSPECTIVE  /  IDEAS', 75, 576);
  } else {
    ctx.fillStyle = '#ffd638';
    ctx.fillRect(76, 66, 84, 84);
    ctx.fillStyle = '#0a105a';
    ctx.font = 'italic 56px Georgia, serif';
    ctx.fillText(monogram.slice(0, 3), 87, 126);
    ctx.textAlign = 'right';
    ctx.font = `600 ${title.length > 36 ? 24 : title.length > 25 ? 30 : 36}px Arial, sans-serif`;
    ctx.fillText(title, 947, 94, 635);
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('FINANCE & RESEARCH', 947, 134);
    ctx.textAlign = 'left';
    const gold = ctx.createLinearGradient(84, 255, 227, 365);
    gold.addColorStop(0, '#fff0aa');
    gold.addColorStop(0.5, '#caa43d');
    gold.addColorStop(1, '#ffe076');
    ctx.fillStyle = gold;
    ctx.fillRect(84, 260, 142, 104);
    ctx.strokeStyle = '#9b8040';
    ctx.lineWidth = 3;
    ctx.strokeRect(84, 260, 142, 104);
    ctx.beginPath();
    ctx.moveTo(84, 312);
    ctx.lineTo(226, 312);
    ctx.moveTo(130, 260);
    ctx.lineTo(130, 364);
    ctx.moveTo(179, 260);
    ctx.lineTo(179, 364);
    ctx.stroke();
    ctx.fillStyle = '#111955';
    ctx.font = 'italic 92px Georgia, serif';
    ctx.fillText('Look closer.', 80, 483);
    ctx.fillStyle = '#48567e';
    ctx.font = '21px Arial, sans-serif';
    ctx.fillText('BUSINESSES   /   MARKETS   /   IDEAS', 83, 564);
    ctx.fillStyle = '#1bba83';
    ctx.beginPath();
    ctx.arc(928, 536, 23, 0, Math.PI * 2);
    ctx.fill();
  }
  return image;
}
