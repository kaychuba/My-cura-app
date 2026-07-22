import { useEffect } from 'react';

/**
 * Sets document.title and the meta description for public pages, restoring
 * the previous values on unmount so navigating into the app (whose pages
 * never call this) doesn't keep stale marketing meta around.
 */
export function usePageMeta({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.content;
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [title, description]);
}
