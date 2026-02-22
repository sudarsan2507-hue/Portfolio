import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Hero3D, NeuralBackground } from './components/ThreeElements';
import { CustomCursor } from './components/CustomCursor';
import { ProjectCard } from './components/ProjectCard';
import { motion, useScroll, useTransform } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Brain, Code, Cpu, Database, Globe, Layers, Mail, ShieldCheck, Terminal, Award, Github } from 'lucide-react';
import { cn } from './lib/utils';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const horizontalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray('.horizontal-section');
      
      gsap.to(sections, {
        xPercent: -100 * (sections.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: horizontalRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (sections.length - 1),
          end: () => "+=" + horizontalRef.current?.offsetWidth,
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const { scrollYProgress } = useScroll();
  const zoomScale = useTransform(scrollYProgress, [0, 0.2], [1, 15]);
  const zoomOpacity = useTransform(scrollYProgress, [0.15, 0.25], [1, 0]);

  return (
    <div ref={containerRef} className="bg-neural-dark">
      <CustomCursor />

      {/* 3D Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <NeuralBackground />
        </Canvas>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center z-10 overflow-hidden">
        <motion.div 
          style={{ scale: zoomScale, opacity: zoomOpacity }}
          className="absolute inset-0 z-0 flex items-center justify-center"
        >
          <Canvas>
            <Hero3D />
          </Canvas>
        </motion.div>

        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="font-mono text-neural-blue uppercase tracking-[0.5em] text-sm mb-4 block">
              CSE (AI/ML) Student @ VIT Chennai
            </span>
            <h1 className="text-[12vw] font-display font-black leading-none tracking-tighter uppercase text-white mix-blend-difference">
              Sudarsan<br />R
            </h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12 flex flex-col items-center"
          >
            <div className="w-px h-24 bg-gradient-to-b from-neural-blue to-transparent animate-pulse" />
            <span className="font-mono text-xs mt-4 opacity-50 uppercase tracking-widest">Scroll to process</span>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative min-h-screen flex items-center py-32 px-12 md:px-24 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div className="space-y-8">
            <h2 className="text-7xl font-display font-bold uppercase tracking-tighter">
              Cognitive <br />
              <span className="text-neural-blue">Architecture</span>
            </h2>
            <p className="text-xl text-white/70 font-light leading-relaxed max-w-xl">
              Building systems that don't just compute, but comprehend. Specialized in Large Language Models, Computer Vision, and Differential Environmental Gradient Analysis.
            </p>
            <div className="flex gap-4">
              <div className="p-6 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                <div className="text-4xl font-display font-bold text-neural-blue">8.0</div>
                <div className="text-xs font-mono uppercase opacity-50 mt-2">CGPA @ VIT Chennai</div>
              </div>
              <div className="p-6 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                <div className="text-4xl font-display font-bold text-neural-purple">2025</div>
                <div className="text-xs font-mono uppercase opacity-50 mt-2">OCI Certified</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Brain />, label: "LLMs & RAG" },
              { icon: <ShieldCheck />, label: "Safety Systems" },
              { icon: <Cpu />, label: "Edge AI" },
              { icon: <Database />, label: "Vector DBs" }
            ].map((skill, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                className="p-8 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="text-neural-blue">{skill.icon}</div>
                <div className="font-mono text-xs uppercase tracking-widest">{skill.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Horizontal Projects Section */}
      <div ref={horizontalRef} className="relative overflow-hidden">
        <div className="horizontal-container">
          <section className="horizontal-section flex items-center justify-center bg-neural-dark border-r border-white/5">
            <ProjectCard 
              title="YT Knowledge Assistant"
              description="A RAG pipeline utilizing LLAMA-3 and a custom SQLite vector schema for intelligent video content querying."
              tags={["LLAMA-3", "RAG", "SQLite", "Python"]}
              image="https://picsum.photos/seed/yt/1200/800"
            />
          </section>
          <section className="horizontal-section flex items-center justify-center bg-neural-dark border-r border-white/5">
            <ProjectCard 
              title="Hawkeye Safety"
              description="Multi-modal safety system using YOLOv8 for detection and Gemini 2.5 Flash for contextual reasoning."
              tags={["YOLOv8", "Gemini 2.5", "Computer Vision"]}
              image="https://picsum.photos/seed/hawk/1200/800"
            />
          </section>
          <section className="horizontal-section flex items-center justify-center bg-neural-dark">
            <ProjectCard 
              title="Disaster Navigation"
              description="Safety-prioritized engine using Differential Environmental Gradient Analysis for optimal routing in crises."
              tags={["Algorithms", "Navigation", "C++", "GIS"]}
              image="https://picsum.photos/seed/disaster/1200/800"
            />
          </section>
        </div>
      </div>

      {/* Skills Matrix */}
      <section className="relative py-32 px-12 md:px-24 z-10">
        <h2 className="text-8xl font-display font-black uppercase tracking-tighter mb-24 text-center">
          Skill <span className="text-glitch">Matrix</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Cognitive Intelligence",
              icon: <Brain className="w-8 h-8" />,
              skills: ["PyTorch", "TensorFlow", "Scikit-Learn", "HuggingFace", "LangChain", "OpenCV"],
              color: "text-neural-blue"
            },
            {
              title: "Structural Logic",
              icon: <Terminal className="w-8 h-8" />,
              skills: ["Python", "C++", "Java", "SQL", "Data Structures", "Algorithms"],
              color: "text-neural-purple"
            },
            {
              title: "Execution",
              icon: <Layers className="w-8 h-8" />,
              skills: ["Docker", "Git", "OCI Cloud", "Flask", "FastAPI", "Linux"],
              color: "text-white"
            }
          ].map((category, i) => (
            <div key={i} className="p-12 border border-white/10 rounded-[3rem] bg-white/5 backdrop-blur-xl group hover:border-neural-blue/50 transition-colors">
              <div className={cn("mb-8", category.color)}>{category.icon}</div>
              <h3 className="text-3xl font-display font-bold uppercase mb-8">{category.title}</h3>
              <div className="flex flex-wrap gap-3">
                {category.skills.map(skill => (
                  <span key={skill} className="px-4 py-2 text-xs font-mono border border-white/10 rounded-lg bg-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accolades */}
      <section className="relative py-32 px-12 md:px-24 z-10 bg-white text-black rounded-[4rem] mx-4">
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-24">
          <h2 className="text-7xl font-display font-black uppercase tracking-tighter leading-none">
            Verified <br />
            <span className="text-neural-purple">Excellence</span>
          </h2>
          <div className="flex gap-4">
            <Award size={64} className="text-neural-purple" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "OCI Generative AI Professional",
              issuer: "Oracle Cloud Infrastructure",
              year: "2025",
              id: "OCI-GENAI-2025"
            },
            {
              title: "OCI Data Science Professional",
              issuer: "Oracle Cloud Infrastructure",
              year: "2025",
              id: "OCI-DS-2025"
            }
          ].map((cert, i) => (
            <div key={i} className="group p-12 border border-black/10 rounded-3xl flex justify-between items-center hover:bg-black hover:text-white transition-all duration-500">
              <div>
                <div className="font-mono text-xs uppercase opacity-50 mb-2">{cert.issuer}</div>
                <h3 className="text-3xl font-display font-bold uppercase">{cert.title}</h3>
                <div className="mt-4 font-mono text-sm">{cert.id}</div>
              </div>
              <div className="text-4xl font-display font-black opacity-20 group-hover:opacity-100 transition-opacity">
                {cert.year}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <footer className="relative h-screen flex flex-col items-center justify-center z-10 px-12 text-center">
        <h2 className="text-[10vw] font-display font-black uppercase tracking-tighter leading-none mb-12">
          Let's <span className="text-neural-blue">Connect</span>
        </h2>
        
        <div className="flex flex-wrap justify-center gap-8 mb-24">
          <a href="mailto:sudarsan@example.com" className="interactive group flex items-center gap-4 text-2xl font-display font-bold uppercase hover:text-neural-blue transition-colors">
            <Mail /> Email
          </a>
          <a href="https://github.com" className="interactive group flex items-center gap-4 text-2xl font-display font-bold uppercase hover:text-neural-blue transition-colors">
            <Github /> Github
          </a>
          <a href="https://linkedin.com" className="interactive group flex items-center gap-4 text-2xl font-display font-bold uppercase hover:text-neural-blue transition-colors">
            <Globe /> LinkedIn
          </a>
        </div>

        <div className="absolute bottom-12 font-mono text-[10px] uppercase tracking-[0.5em] opacity-30">
          Sudarsan R © 2026 // Neural Flow Portfolio
        </div>
      </footer>
    </div>
  );
}
