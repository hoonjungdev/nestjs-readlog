// e2e 테스트는 파일 DB 대신 메모리에만 존재하는 DB를 쓴다.
// 테스트마다 앱을 새로 만들면 DB도 새로 생기므로 서로 영향을 주지 않는다.
process.env.DATABASE_PATH = ':memory:';
