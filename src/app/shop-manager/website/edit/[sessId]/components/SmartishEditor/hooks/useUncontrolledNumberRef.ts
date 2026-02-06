import { useState, useEffect, useCallback } from 'react';

export function useUncontrolledNumberRef(
	params: {
		initialValue: number;
		onImmediateChange: (value: number) => void;
	}
) {
	const { initialValue, onImmediateChange } = params;
	const toNumberOrZero = (value: unknown) => {
		const parsed = typeof value === 'number' ? value : Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};

	const [localValue, setLocalValue] = useState(toNumberOrZero(initialValue));
	// Use a more generic "isInteracting" state
	const [isInteracting, setIsInteracting] = useState(false);

	// Only sync from the prop when not interacting
	useEffect(() => {
		if (!isInteracting) {
			setLocalValue(toNumberOrZero(initialValue));
		}
	}, [initialValue, isInteracting]);

	const handleChange = useCallback((next: number) => {
		setLocalValue(next); // Update local state
		onImmediateChange(next); // Propagate change
	}, [onImmediateChange]);

	// Create a bag of props to pass to the UI component
	const interactionProps = {
		onFocus: () => setIsInteracting(true),
		onBlur: () => setIsInteracting(false),
		onDragStart: () => setIsInteracting(true),
		onDragEnd: () => setIsInteracting(false),
	};

	return {
		value: localValue,
		onChange: handleChange,
		interactionProps,
		getValue: () => localValue,
		setValue: (v: number) => { setLocalValue(v); },
	};
}
