import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
    onClick: () => void;
    visible?: boolean;
}

export const FAB: React.FC<FABProps> = ({ onClick, visible = true }) => {
    const [isVisible, setIsVisible] = useState(visible);

    useEffect(() => {
        setIsVisible(visible);
    }, [visible]);

    return (
        <button
            onClick={onClick}
            className={`md:hidden fixed z-50 bottom-24 right-5 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-75 pointer-events-none'
                }`}
            aria-label="Add New"
        >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
    );
};
