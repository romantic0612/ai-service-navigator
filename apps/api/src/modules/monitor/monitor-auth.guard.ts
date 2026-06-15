import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { MonitorAuthService } from './monitor-auth.service';

type IncomingRequest = Request & { monitorSession?: { userId: string } };

@Injectable()
export class MonitorAuthGuard implements CanActivate {
  constructor(private readonly monitorAuthService: MonitorAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<IncomingRequest>();
    const authResult = this.monitorAuthService.authStatus(req);
    if (!authResult.authorized) {
      throw new ForbiddenException('monitor access denied');
    }

    req.monitorSession = {
      userId: authResult.userId,
    };

    return true;
  }
}
