export interface Player {
  id: string;
  name: string;
  vote: string | null;
}

export interface Room {
  type: string;
  adminId: string;
  showVotes: boolean;
  players: Player[];
}
