import { useEffect, useState } from 'react';
import {
  fetchLookupCategories,
  type ApiLookupCategory,
  type LookupCategoryType,
} from './lookup-categories';

export function useLookupCategories(type: LookupCategoryType) {
  const [items, setItems] = useState<ApiLookupCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchLookupCategories(type)
      .then((data) => {
        if (mounted) {
          setItems(data.filter((i) => i.isActive));
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [type]);

  return { items, loading };
}
