import { useState, useEffect, useCallback } from 'react';

export function useUncontrolledColorRef(
	params: {
		initialColor: string;
		onImmediateChange: (color: string) => void;
		// The component will tell the hook when it's being interacted with
		isInteracting: boolean; 
	}
) {
	const { initialColor, onImmediateChange, isInteracting } = params;
	const [localColor, setLocalColor] = useState(initialColor || '#000000');

	// The same guarded effect
	useEffect(() => {
		if (!isInteracting) {
			setLocalColor(initialColor || '#000000');
		}
	}, [initialColor, isInteracting]);

	const handleChange = useCallback((next: string) => {
		setLocalColor(next);
		onImmediateChange(next);
	}, [onImmediateChange]);

	return {
		color: localColor,
		onChange: handleChange,
		getColor: () => localColor,
		setColor: (c: string) => { setLocalColor(c); },
	};
}
