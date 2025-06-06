interface PostResponse {
  id: string;
  user_id: string;
  content: string;
  category: string;
  hide_from_chat: boolean;
  expires_at: string;
  locked: boolean;
  created_at: string;
  connection_type: string;
  connectionType: string | null;
  keyword_summary: string | null;
  user_interested: boolean;
  user_accepted: boolean;
}

export interface PaginatedPostsResponse {
  posts: PostResponse[];
  pagination: {
    currentPage: number;
    limit: number;
    hasMore: boolean;
    totalFetched: number;
    isUpToDate: boolean;
    nextPage?: number;
  };
}
