
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { textMatchesSearch } from '@/lib/customerSearch';
import { shouldLoadMore } from '@/lib/listQuery';

type ComboboxOption = {
  value: string;
  label: string;
  secondary?: string;
  /** Extra text included in client-side search (e.g. raw phone digits). */
  searchText?: string;
};

/** Paginated batch returned by {@link ComboboxProps.loadPage}. */
type ComboboxPage = {
  options: readonly ComboboxOption[];
  hasMore: boolean;
};

type ComboboxProps = {
  options: readonly ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Single-shot async search: returns the full option set for a query. */
  onSearch?: (query: string) => Promise<readonly ComboboxOption[]>;
  /**
   * Paginated async search with infinite scroll. When provided it supersedes
   * onSearch: page 1 loads on open / when the query changes, and scrolling near
   * the bottom of the dropdown appends the next page. Lets the user browse the
   * whole list by scrolling AND find any record by typing.
   */
  loadPage?: (query: string, page: number) => Promise<ComboboxPage>;
  loading?: boolean;
};

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  onSearch,
  loadPage,
  loading = false,
}: ComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([...options]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isAsync = Boolean(onSearch || loadPage);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || asyncOptions.find((option) => option.value === value),
    [asyncOptions, options, value]
  );

  const filteredOptions = useMemo(() => {
    if (isAsync) {
      return asyncOptions;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      textMatchesSearch(
        [option.label, option.secondary, option.searchText].filter(Boolean).join(' '),
        normalizedQuery
      )
    );
  }, [asyncOptions, isAsync, options, query]);

  useEffect(() => {
    setAsyncOptions([...options]);
  }, [options]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  // Single-shot search: returns the full option set for the query.
  useEffect(() => {
    if (!open || !onSearch) return;

    const handle = window.setTimeout(async () => {
      setAsyncLoading(true);
      try {
        const nextOptions = await onSearch(query.trim());
        setAsyncOptions([...nextOptions]);
        setActiveIndex(0);
      } catch {
        setAsyncOptions([]);
        setActiveIndex(0);
      } finally {
        setAsyncLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, onSearch, query]);

  // Paginated search with infinite scroll: (re)load page 1 on open / query
  // change. Scrolling near the bottom appends subsequent pages (handleScroll).
  useEffect(() => {
    if (!open || !loadPage) return;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setAsyncLoading(true);
      try {
        const result = await loadPage(query.trim(), 1);
        if (cancelled) return;
        setAsyncOptions([...result.options]);
        setPage(1);
        setHasMore(result.hasMore);
        setActiveIndex(0);
        // Reset the scroll position so a fresh result set starts at the top.
        if (listRef.current) listRef.current.scrollTop = 0;
      } catch {
        if (cancelled) return;
        setAsyncOptions([]);
        setPage(1);
        setHasMore(false);
        setActiveIndex(0);
      } finally {
        if (!cancelled) setAsyncLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, loadPage, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!loadPage || loadingMore || asyncLoading || !hasMore) return;
    const el = event.currentTarget;
    if (!shouldLoadMore(el.scrollTop, el.clientHeight, el.scrollHeight)) return;

    const nextPage = page + 1;
    const currentQuery = query.trim();
    setLoadingMore(true);
    void loadPage(currentQuery, nextPage)
      .then((result) => {
        setAsyncOptions((prev) => {
          const seen = new Set(prev.map((option) => option.value));
          const fresh = result.options.filter((option) => !seen.has(option.value));
          return [...prev, ...fresh];
        });
        setPage(nextPage);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        // Keep the current page; avoid unhandled rejections on scroll load.
      })
      .finally(() => setLoadingMore(false));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        onChange(option.value);
        setOpen(false);
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className="input flex items-center justify-between text-left"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'text-text-1' : 'text-text-4'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown size={16} className="text-text-4" />
      </button>

      {open ? (
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="sticky top-0 border-b border-border bg-surface p-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="input pl-8"
              />
            </div>
          </div>
          {(loading || asyncLoading) ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-text-3">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-4 text-sm text-text-3">No options found.</div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left ${
                  index === activeIndex ? 'bg-surface-2' : 'bg-transparent'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span>
                  <span className="block text-sm text-text-1">{option.label}</span>
                  {option.secondary ? (
                    <span className="block text-xs text-text-4">{option.secondary}</span>
                  ) : null}
                </span>
                {option.value === value ? <Check size={14} className="mt-0.5 text-teal-600" /> : null}
              </button>
            ))
          )}
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-text-3">
              <Loader2 size={12} className="animate-spin" />
              Loading more…
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
