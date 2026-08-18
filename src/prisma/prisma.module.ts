import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// DB 접근을 담당하는 모듈. 기능 모듈들이 필요할 때 import해서 쓴다.
//
// @Global()을 붙이면 import 없이 어디서나 쓸 수 있어 편하지만 일부러 쓰지 않았다.
// 전역으로 만들면 "이 모듈이 DB를 쓰는가"가 코드에 드러나지 않아서,
// 나중에 모듈이 늘어났을 때 의존 관계를 눈으로 따라가기 어려워진다.
@Module({
  providers: [PrismaService],
  // exports에 적어야 이 모듈을 import한 다른 모듈에서 주입받을 수 있다.
  // providers에만 적으면 이 모듈 안에서만 쓸 수 있다.
  exports: [PrismaService],
})
export class PrismaModule {}
