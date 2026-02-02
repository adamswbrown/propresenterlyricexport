import { PlaylistItem } from '../propresenter-client';

export interface FlatPlaylistItem {
  uuid: string;
  name: string;
  breadcrumb: string[];
}

export interface PlaylistTreeNode {
  uuid?: string;
  name: string;
  breadcrumb: string[];
  isHeader: boolean;
  children: PlaylistTreeNode[];
}

export function flattenPlaylists(
  items: PlaylistItem[],
  parents: string[] = []
): FlatPlaylistItem[] {
  const result: FlatPlaylistItem[] = [];

  for (const item of items) {
    const breadcrumb = parents.length > 0 ? [...parents, item.name] : [item.name];

    if (!item.isHeader && item.uuid) {
      result.push({
        uuid: item.uuid,
        name: item.name,
        breadcrumb,
      });
    }

    if (item.children && item.children.length > 0) {
      result.push(...flattenPlaylists(item.children, breadcrumb));
    }
  }

  return result;
}

export function formatPlaylistName(item: FlatPlaylistItem): string {
  return item.breadcrumb.join(' / ');
}

export function mapPlaylistTree(
  items: PlaylistItem[],
  parents: string[] = []
): PlaylistTreeNode[] {
  return items.map(item => {
    const breadcrumb = parents.length > 0 ? [...parents, item.name] : [item.name];
    return {
      uuid: !item.isHeader ? item.uuid : undefined,
      name: item.name,
      breadcrumb,
      isHeader: !!item.isHeader,
      children: item.children && item.children.length > 0 ? mapPlaylistTree(item.children, breadcrumb) : [],
    };
  });
}
