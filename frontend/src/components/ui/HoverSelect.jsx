import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './HoverSelect.css';

function flattenOptions(children) {
  const result = [];
  const walk = nodes => {
    Children.forEach(nodes, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        walk(child.props.children);
        return;
      }
      if (child.type === 'option') {
        result.push({
          value: child.props.value ?? String(child.props.children ?? ''),
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        });
      }
    });
  };
  walk(children);
  return result;
}

export default function HoverSelect({
  children,
  value,
  onChange,
  disabled = false,
  className = '',
  name,
  id,
  'aria-label': ariaLabel,
  ...rest
}) {
  const rootRef = useRef(null);
  const generatedId = useId().replaceAll(':', '');
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState('down');
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => flattenOptions(children), [children]);
  const selected = options.find(option => String(option.value) === String(value)) || options[0];
  const selectedIndex = Math.max(0, options.findIndex(option => String(option.value) === String(value)));

  const openMenu = () => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const saveRect = rootRef.current
        ?.closest('.settings-content')
        ?.querySelector('.settings-save-v333')
        ?.getBoundingClientRect();
      const wouldCoverSave = Boolean(
        saveRect
        && saveRect.top >= rect.bottom
        && saveRect.top - rect.bottom < Math.min(280, window.innerHeight * 0.48),
      );
      setDirection((below < 260 && above > below) || wouldCoverSave ? 'up' : 'down');
    }
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    rootRef.current
      ?.querySelector(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = option => {
    if (option.disabled) return;
    onChange?.({
      target: {
        value: option.value,
        name,
      },
      currentTarget: {
        value: option.value,
        name,
      },
    });
    setOpen(false);
  };

  const handleKeyDown = event => {
    if (disabled) return;
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open || !options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      let next = activeIndex;
      do {
        next = (next + step + options.length) % options.length;
      } while (options[next]?.disabled && next !== activeIndex);
      setActiveIndex(next);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const indexes = options.map((_, index) => index).filter(index => !options[index].disabled);
      setActiveIndex(event.key === 'Home' ? indexes[0] : indexes[indexes.length - 1]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      id={id}
      className={`hover-select-v45 ${direction} ${open ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`.trim()}
      onMouseEnter={openMenu}
      onMouseLeave={() => setOpen(false)}
      {...rest}
    >
      <button
        type="button"
        className="hover-select-trigger-v45"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `${id || name || generatedId}-option-${activeIndex}` : undefined}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label ?? '—'}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="hover-select-menu-v45" role="listbox">
          {options.map((option, index) => {
            const active = String(option.value) === String(value);
            return (
              <button
                type="button"
                role="option"
                id={`${id || name || generatedId}-option-${index}`}
                data-option-index={index}
                aria-selected={active}
                disabled={option.disabled}
                className={`${active ? 'active' : ''} ${activeIndex === index ? 'focused' : ''}`.trim()}
                key={`${String(option.value)}-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {active && <Check />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
