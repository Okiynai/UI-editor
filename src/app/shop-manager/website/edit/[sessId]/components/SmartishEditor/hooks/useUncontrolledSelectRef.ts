import { useState, useEffect, useCallback } from 'react';

export function useUncontrolledSelectRef<T extends HTMLSelectElement = HTMLSelectElement>(
	params: {
		initialValue: string;
		onImmediateChange: (value: string) => void;
		isInteracting: boolean;
	}
) {
	const { initialValue, onImmediateChange, isInteracting } = params;
	const [localValue, setLocalValue] = useState(initialValue ?? '');

	useEffect(() => {
		if (!isInteracting) {
			setLocalValue(initialValue ?? '');
		}
	}, [initialValue, isInteracting]);

	const handleChange = useCallback((e: React.ChangeEvent<T>) => {
		const next = e.target.value;
		setLocalValue(next);
		onImmediateChange(next);
	}, [onImmediateChange]);

	return {
		selectProps: {
			value: localValue,
			onChange: handleChange,
		},
		value: localValue,
		onChange: (next: string) => {
			setLocalValue(next);
			onImmediateChange(next);
		},
		getValue: () => localValue,
		setValue: (v: string) => { setLocalValue(v ?? ''); },
	};
}
