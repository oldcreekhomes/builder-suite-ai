import React from 'react';

type MinimalCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  indeterminate?: boolean;
};

export const MinimalCheckbox = React.forwardRef<HTMLInputElement, MinimalCheckboxProps>(
  ({ indeterminate, className, ...props }, passedRef) => {
    const localRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = !!indeterminate && !props.checked;
      }
    }, [indeterminate, props.checked]);

    const setRef = (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof passedRef === 'function') passedRef(node);
      else if (passedRef) (passedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    return (
      <input
        ref={setRef}
        type="checkbox"
        {...props}
        className={['h-3 w-3 align-middle border rounded', className].filter(Boolean).join(' ')}
      />
    );
  }
);
MinimalCheckbox.displayName = 'MinimalCheckbox';
