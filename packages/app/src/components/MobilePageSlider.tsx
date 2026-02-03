import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, PanInfo, useMotionValue } from 'framer-motion';

interface MobilePageSliderProps {
    children: React.ReactNode[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
}

export const MobilePageSlider: React.FC<MobilePageSliderProps> = ({
    children,
    currentIndex,
    onIndexChange
}) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = React.useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        controls.start({
            x: -currentIndex * width,
            transition: { type: "spring", stiffness: 300, damping: 30 }
        });
    }, [currentIndex, controls, width]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const threshold = width / 3;

        let newIndex = currentIndex;

        if (offset < -threshold || velocity < -500) {
            newIndex = Math.min(currentIndex + 1, children.length - 1);
        } else if (offset > threshold || velocity > 500) {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        if (newIndex !== currentIndex) {
            onIndexChange(newIndex);
        } else {
            // Snap back if no change
            controls.start({
                x: -currentIndex * width,
                transition: { type: "spring", stiffness: 300, damping: 30 }
            });
        }
    };

    return (
        <div className="w-full h-full overflow-hidden relative" ref={containerRef}>
            <motion.div
                className="flex h-full touch-pan-y"
                style={{ width: `${children.length * 100}%`, x, touchAction: 'pan-y' }}
                drag="x"
                dragDirectionLock
                dragConstraints={{
                    left: -((children.length - 1) * width),
                    right: 0
                }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                animate={controls}
            >
                {children.map((child, i) => (
                    <div
                        key={i}
                        className="w-screen h-full overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] scrollbar-hide touch-pan-y"
                        style={{ width: width, touchAction: 'pan-y' }}
                    >
                        <div className="max-w-6xl mx-auto min-h-full">
                            {child}
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
