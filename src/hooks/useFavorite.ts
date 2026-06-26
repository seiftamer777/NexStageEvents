import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type ServiceKind = 'venue' | 'restaurant' | 'photographer' | 'av' | 'printing';

export type FavoriteItem = {
  id: string;
  user_id: string;
  service_type: ServiceKind;
  service_id: string;
  service_name: string;
  service_image: string | null;
  service_price: number | null;
  created_at: string;
};

/** Drop-in hook for any service detail screen */
export function useFavorite(
  serviceType: ServiceKind,
  serviceId: string | undefined,
  meta: { name: string; image?: string | null; price?: number | null }
) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!user || !serviceId) return;
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_type', serviceType)
      .eq('service_id', serviceId)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, serviceType, serviceId]);

  const toggle = useCallback(async () => {
    if (!user || !serviceId || loading) return;
    setLoading(true);
    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('service_type', serviceType)
        .eq('service_id', serviceId);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({
        user_id:       user.id,
        service_type:  serviceType,
        service_id:    serviceId,
        service_name:  meta.name,
        service_image: meta.image ?? null,
        service_price: meta.price ?? null,
      });
      setIsFavorite(true);
    }
    setLoading(false);
  }, [user, serviceType, serviceId, isFavorite, loading, meta]);

  return { isFavorite, toggle, loading };
}
