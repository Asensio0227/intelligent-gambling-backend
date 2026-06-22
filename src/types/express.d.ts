import { IUserDocument } from './models.types';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}
