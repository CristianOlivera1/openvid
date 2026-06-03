"use client";

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/navigation';
import { useState, useTransition } from 'react';
import { Icon } from '@iconify/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', name: 'English', icon: 'circle-flags:us' },
  { code: 'es', name: 'Español', icon: 'circle-flags:es' },
  { code: 'ru', name: 'Русский', icon: 'circle-flags:ru' },
  { code: 'vi', name: 'Tiếng Việt', icon: 'circle-flags:vn' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: 'en' | 'es' | 'ru' | 'vi') => {
    if (newLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });

    setIsOpen(false);
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" className='text-xs'
          disabled={isPending}
          aria-label={`Language: ${currentLanguage.name}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Icon icon={currentLanguage.icon} width="18" height="18" aria-hidden="true" />
          <span className="hidden sm:inline font-medium">{currentLanguage.code.toUpperCase()}</span>
          <Icon
            icon="solar:alt-arrow-down-linear"
            width="14"
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-40 bg-[#0a0a0a] border border-white/10 squircle-element shadow-xl p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          sideOffset={5}
        >
          {languages.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              onSelect={() => handleLanguageChange(lang.code as 'en' | 'es' | 'ru' | 'vi')}
              className={`flex items-center gap-3 px-3 py-2 text-sm squircle-element cursor-pointer outline-none transition-colors ${locale === lang.code ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              aria-current={locale === lang.code ? 'true' : undefined}
            >
              <Icon icon={lang.icon} width="20" height="20" aria-hidden="true" />
              <span className="flex-1">{lang.name}</span>
              {locale === lang.code && (
                <Icon icon="solar:check-circle-bold" width="16" className="text-green-400" aria-hidden="true" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}