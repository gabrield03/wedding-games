export const CONNECTIONS_GROUP_SIZE = 4;

export type ConnectionTile = {
  id: string;
  label: string;
};

export type ConnectionGroup = {
  id: string;
  category: string;
  tiles: ConnectionTile[];
};

export type ConnectionsPuzzle = {
  id: string;
  title: string;
  groups: ConnectionGroup[];
};
