import { LocalizationContext } from '@/components/localization-context';
import { useCallback, useContext } from 'react';

type Props = {
  t: (key: string, ...args: unknown[]) => string;
};

export const useLocalization = (): Props => {
  const { data, fallbackData } = useContext(LocalizationContext);

  const t = useCallback(
    (key: string, ...args: unknown[]) => {
      const template = data[key] ?? fallbackData[key] ?? key;

      if (args.length === 0) {
        return template;
      }

      // Replace {0}, {1}, etc. with the corresponding argument
      return template.replace(/{(\d+)}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        return args[argIndex] !== undefined ? String(args[argIndex]) : match;
      });
    },
    [data, fallbackData],
  );

  return { t };
};
