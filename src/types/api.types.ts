export interface RegisterBody {
  name: string;
  lastName: string;
  email: string;
  password: string;
  dob?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  ideaNumber?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface GeneratePredictionBody {
  fixtureId: string;
  mode?: 'shared' | 'personal';
}

export interface SmartBuildBody {
  fixtureIds: string[];
  minConfidence: number;
  minLegs: number;
  maxLegs: number;
  preferredMarkets?: string[];
}

export interface CreateTicketBody {
  label: string;
  legs: Array<{
    predictionId: string;
    fixtureId: string;
    market: string;
    selection: string;
    confidence: number;
  }>;
}

export interface AdminCreateUserBody {
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  dob?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  ideaNumber?: string;
  gender?: 'male' | 'female' | 'other';
  isActive?: boolean;
}

export interface AdminUpdateUserBody {
  name?: string;
  lastName?: string;
  email?: string;
  role?: 'admin' | 'user';
  dob?: string;
  phoneNumber?: string;
  physicalAddress?: string;
  ideaNumber?: string;
  gender?: 'male' | 'female' | 'other';
  isActive?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
