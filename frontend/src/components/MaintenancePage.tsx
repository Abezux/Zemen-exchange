import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Network, Smartphone, Mail, Twitter, Lock, CheckCircle2, Sun, Moon } from 'lucide-react';

interface MousePosition {
  x: number;
  y: number;
}

type Theme = 'light' | 'dark' | 'system';

export const MaintenancePage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Add no-transitions class to prevent animation on initial load
    document.body.classList.add('no-transitions');

    const storedTheme = localStorage.getItem('zemenex-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || 'system';
    const resolved = storedTheme === 'dark' ? 'dark' : storedTheme === 'light' ? 'light' : prefersDark ? 'dark' : 'light';

    setTheme(initialTheme);
    setResolvedTheme(resolved);

    // Apply theme immediately
    if (storedTheme) {
      document.documentElement.setAttribute('data-theme', storedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : storedTheme);
    }

    // Remove no-transitions class after a brief delay
    const timer = setTimeout(() => {
      document.body.classList.remove('no-transitions');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        document.documentElement.setAttribute('data-theme', newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Theme toggle handler
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'light' ? 'dark' : 'light';
    const newResolved = newTheme === 'light' ? 'light' : 'dark';

    setTheme(newTheme);
    setResolvedTheme(newResolved);
    localStorage.setItem('zemenex-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [resolvedTheme]);

  // Cursor glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.left = `${e.clientX - 60}px`;
        cursorGlowRef.current.style.top = `${e.clientY - 60}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-reveal-id');
            if (id) {
              setVisibleElements((prev) => new Set([...prev, id]));
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const elements = document.querySelectorAll('[data-reveal-id]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Network visualization canvas with theme-aware colors
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = resolvedTheme === 'dark';
    const clearColor = isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)';
    const nodeColors = {
      buyer: isDark ? 'rgba(249, 115, 22, 0.9)' : 'rgba(249, 115, 22, 0.8)',
      seller: isDark ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.6)',
      liquidity: isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)',
    };

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Network nodes
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      type: 'buyer' | 'seller' | 'liquidity';
    }> = [];

    const nodeTypes = ['buyer', 'seller', 'liquidity'] as const;
    for (let i = 0; i < 30; i++) {
      nodes.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 2 + 2,
        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
      });
    }

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x - node.radius < 0 || node.x + node.radius > canvas.offsetWidth) {
          node.vx *= -1;
          node.x = Math.max(node.radius, Math.min(canvas.offsetWidth - node.radius, node.x));
        }
        if (node.y - node.radius < 0 || node.y + node.radius > canvas.offsetHeight) {
          node.vy *= -1;
          node.y = Math.max(node.radius, Math.min(canvas.offsetHeight - node.radius, node.y));
        }

        // Draw connections
        nodes.forEach((other, j) => {
          if (i >= j) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const opacity = (1 - dist / 150) * (isDark ? 0.4 : 0.3);
            ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });

        // Draw node
        ctx.fillStyle = nodeColors[node.type];
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        const baseColor = nodeColors[node.type];
        const glowOpacity = isDark ? 0.4 : 0.3;
        glowGradient.addColorStop(0, baseColor.replace(/[\d.]+\)/, `${glowOpacity})`));
        glowGradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden custom-scrollbar transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Theme Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 w-12 h-12 rounded-full glass-effect flex items-center justify-center hover:glass-effect-dark transition-all group lg:hover:scale-110"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <AnimatePresence mode="wait">
          {resolvedTheme === 'light' ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Sun
                size={20}
                className="text-orange-500"
              />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Moon
                size={20}
                className="text-orange-400"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Cursor glow effect */}
      <div ref={cursorGlowRef} className="cursor-glow hidden lg:block" />

      {/* Background mesh gradient */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-300"
        style={{ background: 'var(--mesh-gradient)' }}
      />

      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl animate-float-y transition-colors duration-300"
          style={{
            backgroundColor: resolvedTheme === 'light' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.1)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl animate-float-y-large transition-colors duration-300"
          style={{
            animationDelay: '1s',
            backgroundColor: resolvedTheme === 'light' ? 'rgba(249, 115, 22, 0.03)' : 'rgba(249, 115, 22, 0.08)',
          }}
        />
      </div>

      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-neon z-50 transition-all"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8 relative overflow-hidden pt-20 md:pt-0">
          {/* Animated canvas background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-40 transition-opacity duration-300"
            style={{
              filter: resolvedTheme === 'light' ? 'brightness(0.6)' : 'brightness(0.8)',
            }}
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 relative">
                <div
                  className="absolute inset-0 rounded-2xl blur-lg opacity-20 animate-pulse-glow transition-colors duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f97316 100%)',
                  }}
                />
                <img
                  src="/zemenlogo.png"
                  alt="Zemenex"
                  className="w-full h-full object-contain relative z-10"
                />
              </div>
            </motion.div>

            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full text-sm font-medium transition-all duration-300"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Platform Upgrade In Progress
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #1f2937 0%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ZEMENEX 2.0
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed transition-colors duration-300"
              style={{ color: 'var(--text-secondary)' }}
            >
              Rebuilding the future of secure P2P trading.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button className="group relative px-8 py-4 rounded-xl font-semibold overflow-hidden transition-all hover:scale-105">
                <div className="absolute inset-0 bg-gradient-neon opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white drop-shadow-lg">Get Notified</span>
              </button>
              <button
                className="px-8 py-4 rounded-xl font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50 transition-colors dark:text-orange-400 dark:hover:bg-orange-500/10"
                style={{
                  borderColor: '#ea580c',
                  color: resolvedTheme === 'light' ? '#ea580c' : '#fb923c',
                  backgroundColor: resolvedTheme === 'light' ? 'transparent' : 'transparent',
                }}
              >
                Learn More
              </button>
            </motion.div>
          </div>
        </section>
                 
        {/*Upgrade Progress Section
        <section className="py-20 md:py-32 px-4 md:px-8 relative">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                What's Coming
              </h2>
              <p className="text-lg max-w-2xl mx-auto transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                A comprehensive platform transformation delivering enhanced security, speed, and reliability.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[
                {
                  id: 'security',
                  icon: Shield,
                  title: 'Enhanced Security',
                  desc: 'Multi-layer protection with advanced encryption and compliance standards.',
                  features: ['Zero-knowledge architecture', 'Quantum-resistant encryption', 'Institutional-grade security'],
                },
                {
                  id: 'performance',
                  icon: Zap,
                  title: 'Faster Trade Processing',
                  desc: 'Lightning-quick transaction settlement and real-time order matching.',
                  features: ['Sub-second execution', 'Advanced order types', 'Optimized liquidity pools'],
                },
                {
                  id: 'infrastructure',
                  icon: Network,
                  title: 'Infrastructure Upgrade',
                  desc: 'Next-generation distributed network for maximum reliability.',
                  features: ['Global node network', '99.99% uptime', 'Automated failover'],
                },
                {
                  id: 'mobile',
                  icon: Smartphone,
                  title: 'Mobile First Experience',
                  desc: 'Premium mobile application with desktop-parity features.',
                  features: ['Native apps (iOS/Android)', 'Offline transactions', 'Biometric security'],
                },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                const revealId = `upgrade-${idx}`;
                const isVisible = visibleElements.has(revealId);

                return (
                  <motion.div
                    key={item.id}
                    data-reveal-id={revealId}
                    initial={{ opacity: 0, y: 40 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ delay: idx * 0.1, duration: 0.6 }}
                    className="rounded-2xl hover:glass-effect-dark transition-all group cursor-pointer"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      padding: '2rem',
                    }}
                  >
                    <div className="mb-6 relative">
                      <div className="w-14 h-14 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity absolute inset-0 bg-gradient-neon" />
                      <IconComponent className="w-8 h-8 text-orange-600 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                    <p className="mb-6 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                      {item.desc}
                    </p>
                    <ul className="space-y-2">
                      {item.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
*/}
        {/* System Status Section 
        <section className="py-20 md:py-32 px-4 md:px-8 relative">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl relative overflow-hidden transition-all duration-300"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                padding: '3rem',
              }}
            >*/}
              {/* Glow background 
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl transition-colors duration-300"
                style={{
                  backgroundColor: resolvedTheme === 'light' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.1)',
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm font-semibold text-orange-600 uppercase tracking-wider">System Status</span>
                </div>

                <h3 className="text-3xl md:text-4xl font-black mb-8" style={{ color: 'var(--text-primary)' }}>
                  Upgrade In Progress
                </h3>

                <div className="space-y-4">
                  {[
                    { label: 'Core Services', status: 'optimizing' },
                    { label: 'Security Systems', status: 'reinforcing' },
                    { label: 'Trading Infrastructure', status: 'expanding' },
                    { label: 'Mobile Platform', status: 'enhancing' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-4 transition-colors duration-300"
                      style={{
                        borderBottom: `1px solid var(--border-light)`,
                      }}
                    >
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-orange-500"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ delay: i * 0.1, duration: 1.2, repeat: Infinity }}
                            />
                          ))}
                        </div>
                        <span className="text-xs capitalize transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
                    Expected Availability
                  </p>
                  <p className="text-2xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
                    Coming Very Soon
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
                */}
        {/* Security Assurance Section 
        <section className="py-20 md:py-32 px-4 md:px-8 relative">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Your Security Matters
              </h2>
              <p className="text-lg transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                During our upgrade, we maintain the highest standards of protection.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'balance',
                  icon: Lock,
                  title: 'User Balances',
                  desc: 'Remain completely secure with our multi-signature vault system.',
                },
                {
                  id: 'data',
                  icon: Shield,
                  title: 'Account Data',
                  desc: 'Protected with end-to-end encryption and zero-knowledge proofs.',
                },
                {
                  id: 'action',
                  icon: CheckCircle2,
                  title: 'No Action Required',
                  desc: 'Just relax and enjoy the anticipation of our new platform.',
                },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                const revealId = `security-${idx}`;
                const isVisible = visibleElements.has(revealId);

                return (
                  <motion.div
                    key={item.id}
                    data-reveal-id={revealId}
                    initial={{ opacity: 0, y: 40 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ delay: idx * 0.1, duration: 0.6 }}
                    className="group relative transition-all duration-300"
                  >
                    <div className="absolute -inset-4 opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all bg-gradient-neon" />
                    <div
                      className="relative rounded-2xl text-center hover:glass-effect-dark transition-all p-8"
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div className="inline-block mb-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1))`,
                          }}
                        >
                          <IconComponent className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h3>
                      <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>*/}

        {/* Newsletter Section 
        <section className="py-20 md:py-32 px-4 md:px-8 relative">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl text-center transition-all duration-300"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                padding: '3rem',
              }}
            >
              <h3 className="text-3xl md:text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
                Stay Updated
              </h3>
              <p className="max-w-md mx-auto mb-8 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                Join our community to get exclusive updates about Zemenex 2.0 launch.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  style={{
                    backgroundColor: resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'var(--border-light)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button className="px-8 py-3 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-orange-500/50 transition-all bg-gradient-neon">
                  Notify Me
                </button>
              </div>
            </motion.div>
          </div>
        </section>
          */}
        {/* Footer 
        <footer className="py-16 px-4 md:px-8 relative transition-all duration-300" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              <div>
                <h4 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                  About Zemenex
                </h4>
                <p className="text-sm leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  The future of secure peer-to-peer cryptocurrency trading, built with trust and innovation.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                  Product
                </h4>
                <ul className="space-y-2 text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  <li>
                    <a href="#" className="hover:text-orange-600 transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-orange-600 transition-colors">
                      Security
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-orange-600 transition-colors">
                      Trading
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                  Connect
                </h4>
                <div className="flex gap-4">
                  <a
                    href="mailto:support@zemenex.com"
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-orange-500/10 transition-colors"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Mail className="w-5 h-5 text-orange-600" />
                  </a>
                  <a
                    href="https://twitter.com/zemenex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-orange-500/10 transition-colors"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Twitter className="w-5 h-5 text-orange-600" />
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center text-sm transition-colors duration-300" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', color: 'var(--text-tertiary)' }}>
              <p>© 2024 Zemenex. Building the future of peer-to-peer trading.</p>
            </div>
          </div>
        </footer>*/}
      </div>
    </div>
  );
};
