
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export type TabsVariant = 'underline' | 'inline' | 'section';

type TabsContextValue = {
  value: string;
  onChange: (value: string) => void;
  baseId: string;
  variant: TabsVariant;
  ariaLabel: string;
  registerTab: (value: string, el: HTMLButtonElement | null) => void;
  getTabProps: (value: string, disabled?: boolean) => {
    id: string;
    role: 'tab';
    'aria-selected': boolean;
    'aria-controls': string;
    tabIndex: number;
    disabled?: boolean;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  };
  getPanelProps: (value: string) => {
    id: string;
    role: 'tabpanel';
    'aria-labelledby': string;
    hidden: boolean;
  };
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

const TABLIST_CLASS: Record<TabsVariant, string> = {
  underline: 'flex min-w-0 flex-1 items-end gap-1',
  inline: 'ops-inline-tabs',
  section: 'ops-section-tabs',
};

const TAB_CLASS: Record<TabsVariant, string> = {
  underline:
    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors border-transparent text-[var(--text-3)] hover:text-[var(--text-1)] data-[selected=true]:border-primary-600 data-[selected=true]:text-primary-700 dark:data-[selected=true]:text-primary-400',
  inline: 'ops-inline-tab capitalize',
  section: 'ops-section-tab',
};

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  variant?: TabsVariant;
  'aria-label': string;
  children: ReactNode;
}

/** Controlled tab root — pairs with TabList / Tab / TabPanel. */
export function Tabs({
  value,
  onValueChange,
  variant = 'underline',
  'aria-label': ariaLabel,
  children,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabOrder = useRef<string[]>([]);

  const registerTab = useCallback((tabValue: string, el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(tabValue, el);
      if (!tabOrder.current.includes(tabValue)) {
        tabOrder.current.push(tabValue);
      }
    } else {
      tabRefs.current.delete(tabValue);
      tabOrder.current = tabOrder.current.filter((v) => v !== tabValue);
    }
  }, []);

  const focusTab = useCallback((tabValue: string) => {
    tabRefs.current.get(tabValue)?.focus();
  }, []);

  const focusRelative = useCallback(
    (current: string, direction: 1 | -1) => {
      const enabled = tabOrder.current.filter((v) => {
        const el = tabRefs.current.get(v);
        return el && !el.disabled;
      });
      const idx = enabled.indexOf(current);
      if (idx === -1) return;
      const next = enabled[(idx + direction + enabled.length) % enabled.length];
      onValueChange(next);
      focusTab(next);
    },
    [focusTab, onValueChange]
  );

  const focusEdge = useCallback(
    (current: string, edge: 'start' | 'end') => {
      const enabled = tabOrder.current.filter((v) => {
        const el = tabRefs.current.get(v);
        return el && !el.disabled;
      });
      if (enabled.length === 0) return;
      const next = edge === 'start' ? enabled[0] : enabled[enabled.length - 1];
      if (next === current) return;
      onValueChange(next);
      focusTab(next);
    },
    [focusTab, onValueChange]
  );

  const getTabProps = useCallback(
    (tabValue: string, disabled = false) => ({
      id: `${baseId}-tab-${tabValue}`,
      role: 'tab' as const,
      'aria-selected': value === tabValue,
      'aria-controls': `${baseId}-panel-${tabValue}`,
      tabIndex: value === tabValue && !disabled ? 0 : -1,
      disabled,
      onClick: () => {
        if (!disabled) onValueChange(tabValue);
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            focusRelative(tabValue, 1);
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            focusRelative(tabValue, -1);
            break;
          case 'Home':
            event.preventDefault();
            focusEdge(tabValue, 'start');
            break;
          case 'End':
            event.preventDefault();
            focusEdge(tabValue, 'end');
            break;
          default:
            break;
        }
      },
    }),
    [baseId, focusEdge, focusRelative, onValueChange, value]
  );

  const getPanelProps = useCallback(
    (panelValue: string) => ({
      id: `${baseId}-panel-${panelValue}`,
      role: 'tabpanel' as const,
      'aria-labelledby': `${baseId}-tab-${panelValue}`,
      hidden: value !== panelValue,
    }),
    [baseId, value]
  );

  const context = useMemo(
    () => ({
      value,
      onChange: onValueChange,
      baseId,
      variant,
      ariaLabel,
      registerTab,
      getTabProps,
      getPanelProps,
    }),
    [ariaLabel, baseId, getPanelProps, getTabProps, onValueChange, registerTab, value, variant]
  );

  return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>;
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const { variant, ariaLabel } = useTabsContext();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${TABLIST_CLASS[variant]}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function Tab({ value, disabled = false, className, children }: TabProps) {
  const { variant, registerTab, getTabProps, value: activeValue } = useTabsContext();
  const tabProps = getTabProps(value, disabled);
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      {...tabProps}
      ref={(el) => registerTab(value, el)}
      data-selected={isActive}
      className={`${TAB_CLASS[variant]}${isActive && variant !== 'underline' ? ' active' : ''}${
        className ? ` ${className}` : ''
      }`}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { getPanelProps, value: activeValue } = useTabsContext();
  const panelProps = getPanelProps(value);
  if (activeValue !== value) return null;

  return (
    <div {...panelProps} className={className}>
      {children}
    </div>
  );
}

/** Hook for headless tab wiring when compound components are too heavy. */
export function useTabList<T extends string>(options: {
  value: T;
  onChange: (value: T) => void;
  items: T[];
  idPrefix?: string;
}) {
  const autoId = useId();
  const baseId = options.idPrefix ?? autoId;
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());

  const registerTab = useCallback((tabValue: T, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(tabValue, el);
    else tabRefs.current.delete(tabValue);
  }, []);

  const focusTab = useCallback((tabValue: T) => {
    tabRefs.current.get(tabValue)?.focus();
  }, []);

  const focusRelative = useCallback(
    (current: T, direction: 1 | -1) => {
      const enabled = options.items.filter((v) => {
        const el = tabRefs.current.get(v);
        return el && !el.disabled;
      });
      const idx = enabled.indexOf(current);
      if (idx === -1) return;
      const next = enabled[(idx + direction + enabled.length) % enabled.length];
      options.onChange(next);
      focusTab(next);
    },
    [focusTab, options]
  );

  const getTabProps = useCallback(
    (tabValue: T, disabled = false) => ({
      id: `${baseId}-tab-${tabValue}`,
      role: 'tab' as const,
      'aria-selected': options.value === tabValue,
      'aria-controls': `${baseId}-panel-${tabValue}`,
      tabIndex: options.value === tabValue && !disabled ? 0 : -1,
      disabled,
      ref: (el: HTMLButtonElement | null) => registerTab(tabValue, el),
      onClick: () => {
        if (!disabled) options.onChange(tabValue);
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            focusRelative(tabValue, 1);
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            focusRelative(tabValue, -1);
            break;
          default:
            break;
        }
      },
    }),
    [baseId, focusRelative, options, registerTab]
  );

  const getPanelProps = useCallback(
    (panelValue: T) => ({
      id: `${baseId}-panel-${panelValue}`,
      role: 'tabpanel' as const,
      'aria-labelledby': `${baseId}-tab-${panelValue}`,
      hidden: options.value !== panelValue,
    }),
    [baseId, options.value]
  );

  return { getTabProps, getPanelProps, baseId };
}
