import { useState, useEffect, useCallback, useRef } from 'react';

export function useUncontrolledFieldRef<T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(
	params: {
		initialValue: string;
		onImmediateChange: (value: string) => void;
	}
) {
	const { initialValue, onImmediateChange } = params;

	// 1. Switch from useRef to useState to control the input's value directly.
	const [localValue, setLocalValue] = useState(initialValue ?? '');
	const [isFocused, setIsFocused] = useState(false);
	const latestValueRef = useRef(initialValue ?? ''); // Ref to hold the latest value for blur commit
	const composingRef = useRef<boolean>(false);

	// Update ref whenever localValue changes
	useEffect(() => {
		latestValueRef.current = localValue;
	}, [localValue]);

	// 2. The critical change: Only sync from the external prop if the input is NOT focused.
	useEffect(() => {
		if (!isFocused) {
			setLocalValue(initialValue ?? '');
		}
	}, [initialValue, isFocused]);

	const handleChange = useCallback((e: React.ChangeEvent<T>) => {
		// Update local state immediately for a snappy UI
		setLocalValue(e.target.value);

		// Always forward to iframe immediately
		onImmediateChange(e.target.value);
	}, [onImmediateChange]);
    
	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
		// On blur, ensure latest value is committed
		onImmediateChange(latestValueRef.current);
	}, [onImmediateChange]);

	const onCompositionStart = useCallback(() => {
		composingRef.current = true;
	}, []);

	const onCompositionEnd = useCallback(() => {
		composingRef.current = false;
		// Immediately send the final composed value
		onImmediateChange(latestValueRef.current);
	}, [onImmediateChange]);

	return {
		inputProps: {
			// 4. Use `value` instead of `defaultValue`
			value: localValue,
			onChange: handleChange,
			onFocus: handleFocus,
			onBlur: handleBlur,
			onCompositionStart,
			onCompositionEnd,
		},
		getValue: () => latestValueRef.current,
		setValue: (v: string) => { 
			setLocalValue(v);
			latestValueRef.current = v;
		},
		isComposing: () => composingRef.current,
	};
} 