import { RefObject, useCallback, useEffect, useState, useRef } from "react";

export const useScrollToBottom = (
    scrollContainerRef: RefObject<HTMLDivElement | null>,
    messagesEndRef: RefObject<HTMLDivElement | null>
) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isScrollPinned, setIsScrollPinned] = useState(true);
    const [showBottomShadow, setShowBottomShadow] = useState(false);
    const lastScrollTopRef = useRef(0);
    const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll function - debounced to prevent excessive scrolling
    const autoScroll = useCallback(() => {
        if (autoScrollTimeoutRef.current) {
            clearTimeout(autoScrollTimeoutRef.current);
        }

        autoScrollTimeoutRef.current = setTimeout(() => {
            if (isScrollPinned) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100); // Small debounce to prevent excessive scrolling
    }, [isScrollPinned, messagesEndRef]);

    // Trigger auto-scroll on isScrollPinned changes only
    useEffect(() => {
        if (isScrollPinned) {
            autoScroll();
        }
    }, [isScrollPinned, autoScroll]);

    // Memoized scroll handler to prevent re-renders
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        setIsScrolled(scrollTop > 10);
        setShowScrollToBottom(distanceFromBottom > 500);
        
        // Show bottom shadow when not at bottom (more than 50px from bottom)
        setShowBottomShadow(distanceFromBottom > 50);

        // Check if user actually scrolled up from bottom
        if (scrollTop < lastScrollTopRef.current && distanceFromBottom > 50) {
            setIsScrollPinned(false);
        }

        // Check if user scrolled down to bottom
        if (distanceFromBottom < 100) {
            setIsScrollPinned(true);
        }

        lastScrollTopRef.current = scrollTop;
    }, [scrollContainerRef]);

    // Scroll event handling - only set up once
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]); // Only depend on the memoized handleScroll function

    const handleScrollToBottom = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });

            // Pin when user clicks scroll button
            setIsScrollPinned(true);
        }
    }, [scrollContainerRef]);

    return {
        isScrolled,
        showScrollToBottom,
        isScrollPinned,
        setIsScrollPinned,
        showBottomShadow,
        handleScrollToBottom,
        triggerAutoScroll: autoScroll
    };
};

