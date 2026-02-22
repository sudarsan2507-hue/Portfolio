import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Github } from 'lucide-react';

interface ProjectProps {
  title: string;
  description: string;
  tags: string[];
  image: string;
  link?: string;
  github?: string;
}

export const ProjectCard: React.FC<ProjectProps> = ({ title, description, tags, image, link, github }) => {
  return (
    <motion.div 
      className="group relative w-full h-full flex flex-col md:flex-row items-center justify-center gap-12 px-12 md:px-24"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full md:w-1/2 aspect-video overflow-hidden border border-white/10 rounded-2xl">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-neural-purple/20 mix-blend-overlay group-hover:opacity-0 transition-opacity" />
      </div>

      <div className="w-full md:w-1/2 flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="px-3 py-1 text-[10px] font-mono border border-white/20 rounded-full uppercase tracking-wider bg-white/5">
              {tag}
            </span>
          ))}
        </div>
        
        <h3 className="text-5xl md:text-7xl font-display font-bold tracking-tighter uppercase leading-none">
          {title}
        </h3>
        
        <p className="text-lg text-white/60 font-light max-w-md leading-relaxed">
          {description}
        </p>

        <div className="flex gap-4">
          {github && (
            <a href={github} target="_blank" rel="noopener noreferrer" className="interactive p-4 border border-white/10 rounded-full hover:bg-white hover:text-black transition-colors">
              <Github size={24} />
            </a>
          )}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="interactive p-4 border border-white/10 rounded-full hover:bg-white hover:text-black transition-colors">
              <ExternalLink size={24} />
            </a>
          )}
        </div>
      </div>

      <div className="absolute bottom-12 left-24 text-[120px] font-display font-black text-white/5 pointer-events-none select-none uppercase">
        {title.split(' ')[0]}
      </div>
    </motion.div>
  );
};
