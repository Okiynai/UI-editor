'use client';

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

type FormValues = Record<string, any>;

interface FormContextType {
    formValues: FormValues;
    setFormValue: (name: string, value: any) => void;
    resetForm: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider = ({ children }: { children: ReactNode }) => {
    const [formValues, setFormValues] = useState<FormValues>({});

    const handleSetFormValue = useCallback((name: string, value: any) => {
        setFormValues(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const handleResetForm = useCallback(() => {
        setFormValues({});
    }, []);

    const value = {
        formValues,
        setFormValue: handleSetFormValue,
        resetForm: handleResetForm
    };

    return (
        <FormContext.Provider value={value}>
            {children}
        </FormContext.Provider>
    );
};

export const useFormState = (): FormContextType | undefined => {
    // This hook can be used in components that are not necessarily inside a form,
    // so we return undefined if the context is not found.
    return useContext(FormContext);
}; 