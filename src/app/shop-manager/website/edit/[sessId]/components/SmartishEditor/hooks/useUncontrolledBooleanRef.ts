import { useState, useEffect, useCallback } from 'react';

export function useUncontrolledBooleanRef<T extends HTMLInputElement = HTMLInputElement>(
	params: {
		initialChecked: boolean;
		onImmediateChange: (checked: boolean) => void;
	}
) {
	const { initialChecked, onImmediateChange } = params;
	const [isChecked, setIsChecked] = useState(!!initialChecked);
	const [isFocused, setIsFocused] = useState(false);

	useEffect(() => {
		if (!isFocused) {
			setIsChecked(!!initialChecked);
		}
	}, [initialChecked, isFocused]);

	const handleChange = useCallback((e: React.ChangeEvent<T>) => {
		const next = !!e.target.checked;
		setIsChecked(next);
		onImmediateChange(next);
	}, [onImmediateChange]);

	return {
		inputProps: {
			// Use `checked` instead of `defaultChecked`
			checked: isChecked,
			onChange: handleChange,
			onFocus: () => setIsFocused(true),
			onBlur: () => setIsFocused(false),
		},
		getChecked: () => isChecked,
		setChecked: (v: boolean) => { setIsChecked(!!v); },
	};
}
