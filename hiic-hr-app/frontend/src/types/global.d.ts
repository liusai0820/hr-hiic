interface Window {
  hiicHrExplicitSignOut?: boolean;
  hiicHrSession?: {
    user: {
      id: string;
      email?: string;
      user_metadata?: {
        姓名?: string;
        性别?: string;
        年龄?: number;
        部门?: string;
        职位?: string;
      };
    };
    access_token: string;
    refresh_token?: string;
    expires_at?: number | string;
  };
  hiicHrAuthInitialized?: boolean;
} 