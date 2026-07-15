
import { useRouter } from '@/lib/router-compat';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';

type ActiveTab = 'itemType' | 'item' | 'template' | 'ingredients' | 'vendors';

interface MenuSectionTabsProps {
  active: ActiveTab;
}

export default function MenuSectionTabs({ active }: MenuSectionTabsProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const permissionSet = user?.permissions || [];

  const canViewItemType = hasAnyPermission(permissionSet, ['view_itemtype', 'manage_menu']);
  const canViewItem = hasAnyPermission(permissionSet, ['view_item', 'manage_menu']);
  const canViewTemplate = hasAnyPermission(permissionSet, ['view_templatemenu', 'manage_menu']);

  const tabs: { key: ActiveTab; label: string; href: string; enabled: boolean }[] = [
    { key: 'itemType', label: 'Item Types', href: '/dashboard/menu?section=itemType', enabled: canViewItemType },
    { key: 'item', label: 'Items', href: '/dashboard/menu?section=item', enabled: canViewItem },
    { key: 'template', label: 'Menu templates', href: '/dashboard/menu?section=template', enabled: canViewTemplate },
    { key: 'ingredients', label: 'Ingredients', href: '/dashboard/menu/ingredients', enabled: canViewItem },
    { key: 'vendors', label: 'Vendors', href: '/dashboard/menu/vendors', enabled: canViewItem },
  ];

  return (
    <div className="ops-section-tabs" role="tablist" aria-label="Menu sections">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          disabled={!tab.enabled}
          onClick={() => router.push(tab.href)}
          className={`ops-section-tab ${active === tab.key && tab.enabled ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
