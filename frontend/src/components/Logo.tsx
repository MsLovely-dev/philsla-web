import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import philslaLogoImg from '../assets/images/philsla_logo_export_1781765429472.jpg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'white' | 'navy' | 'red' | 'gold';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
  useImage?: boolean;
}

export function Logo({ 
  className, 
  size = 'md', 
  variant = 'navy',
  showText = false,
  layout = 'vertical',
  useImage = false
}: LogoProps) {
  if (useImage) {
    const imgSizes = {
      sm: 'h-8 sm:h-10',
      md: 'h-14 sm:h-16',
      lg: 'h-20 sm:h-24',
      xl: 'h-32 sm:h-40'
    };
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className={cn("flex items-center justify-center shrink-0 overflow-hidden", className)}
      >
        <img 
          src={philslaLogoImg} 
          alt="PhilSLA Logo" 
          className={cn("object-contain rounded-xl mix-blend-multiply", imgSizes[size])}
          referrerPolicy="no-referrer"
        />
      </motion.div>
    );
  }

  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-40 h-40'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };

  const brandNavy = variant === 'white' ? '#FFFFFF' : "#002855";
  const brandRed = variant === 'white' ? '#FFFFFF' : "#8A1538";
  const brandGold = variant === 'white' ? '#FFFFFF' : "#FFB81C";
  const bookPages = variant === 'white' ? 'rgba(255,255,255,0.3)' : 'white';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "flex gap-1", 
        layout === 'vertical' ? "flex-col items-center" : "flex-row items-center gap-4",
        className
      )}
    >
      <div className={cn("relative flex items-center justify-center shrink-0", sizes[size])}>
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-sm">
          {/* Circular Frame Sweeps */}
          <path 
            d="M 50,200 A 150,150 0 0,0 200,350" 
            fill="none" 
            stroke={brandNavy} 
            strokeWidth="20" 
            strokeLinecap="round"
          />
          <path 
            d="M 350,200 A 150,150 0 0,1 200,350" 
            fill="none" 
            stroke={brandRed} 
            strokeWidth="20" 
            strokeLinecap="round"
          />

          {/* Three Stars */}
          <path d="M 175,45 l 3,7 h 8 l -6,5 l 2,8 l -7,-5 l -7,5 l 2,-8 l -6,-5 h 8 z" fill={brandGold} />
          <path d="M 200,20 l 5,12 h 14 l -11,8 l 4,13 l -12,-9 l -12,9 l 4,-13 l -11,-8 h 14 z" fill={brandGold} />
          <path d="M 225,45 l 3,7 h 8 l -6,5 l 2,8 l -7,-5 l -7,5 l 2,-8 l -6,-5 h 8 z" fill={brandGold} />
          
          {/* Gold Arch */}
          <path 
            d="M 100,120 A 120,80 0 0,1 300,120" 
            fill="none" 
            stroke={brandGold} 
            strokeWidth="12" 
            strokeLinecap="round"
          />

          {/* Graduation Cap */}
          <path d="M 150,110 L 250,110 L 290,140 L 210,170 L 110,140 Z" fill={brandNavy} />
          <path d="M 175,155 L 175,185 L 210,195 L 245,185 L 245,155" fill={brandNavy} />
          <path d="M 290,140 L 290,170" stroke={brandNavy} strokeWidth="4" strokeLinecap="round" />
          <circle cx="290" cy="180" r="6" fill={brandNavy} />

          {/* Book */}
          <path d="M 120,240 Q 150,220 200,240 Q 250,220 280,240 L 300,300 Q 250,280 200,300 Q 150,280 100,300 Z" fill={brandNavy} />
          <path d="M 200,240 L 200,300" stroke={bookPages} strokeWidth="2" />
          <path d="M 130,250 Q 155,235 195,250" fill="none" stroke={bookPages} strokeWidth="1" strokeOpacity="0.3" />
          <path d="M 135,260 Q 160,245 195,260" fill="none" stroke={bookPages} strokeWidth="1" strokeOpacity="0.3" />
          <path d="M 205,250 Q 245,235 270,250" fill="none" stroke={bookPages} strokeWidth="1" strokeOpacity="0.3" />
          <path d="M 205,260 Q 245,245 265,260" fill="none" stroke={bookPages} strokeWidth="1" strokeOpacity="0.3" />

          {/* Torch & Flame */}
          <path d="M 185,220 L 215,220 L 210,310 L 190,310 Z" fill={brandNavy} />
          <path d="M 180,210 L 220,210 L 215,230 L 185,230 Z" fill={brandNavy} stroke={brandNavy} strokeWidth="2" />
          
          <path 
            d="M 200,105 C 180,140 220,160 200,200 C 230,160 190,140 200,105" 
            fill={brandGold} 
            className="animate-pulse"
          />
        </svg>
      </div>

      {showText && (
        <div className={cn(
          "flex flex-col",
          layout === 'vertical' ? "items-center" : "items-start"
        )}>
          <div className={cn(
            "font-black tracking-tighter leading-none mb-0.5", 
            textSizes[size]
          )}>
             <span style={{ color: brandNavy }}>Phil</span>
             <span style={{ color: variant === 'white' ? '#FFFFFF' : brandRed }}>SLA</span>
          </div>
          
          {/* Bottom Accent Line */}
          <div className="w-full h-[2px] flex">
             <div className="flex-1" style={{ backgroundColor: brandNavy }} />
             <div className={cn("flex-1", variant === 'white' ? 'bg-white/40' : 'bg-[#FFB81C]')} />
             <div className="flex-1" style={{ backgroundColor: brandRed }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
