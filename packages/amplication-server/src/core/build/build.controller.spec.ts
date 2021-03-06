import request from 'supertest';
import { Readable } from 'stream';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MorganModule } from 'nest-morgan';
import { BuildController } from './build.controller';
import { BuildService } from './build.service';
import { BuildNotFoundError } from './errors/BuildNotFoundError';
import { BuildResultNotFound } from './errors/BuildResultNotFound';
import { BuildNotCompleteError } from './errors/BuildNotCompleteError';
import { EnumBuildStatus } from './dto/EnumBuildStatus';

const EXAMPLE_BUILD_ID = 'ExampleBuildId';
const EXAMPLE_BUILD_CONTENT_CHUNK = 'ExampleBuildContentChunk';

const downloadMock = jest.fn(() => {
  return Readable.from([EXAMPLE_BUILD_CONTENT_CHUNK]);
});

describe('BuildController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [MorganModule.forRoot()],
      providers: [
        {
          provide: BuildService,
          useClass: jest.fn(() => ({
            download: downloadMock
          }))
        }
      ],
      controllers: [BuildController]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  test('get generated app archive', async () => {
    await request(app.getHttpServer())
      .get(`/generated-apps/${EXAMPLE_BUILD_ID}.zip`)
      .expect(HttpStatus.OK)
      .expect(EXAMPLE_BUILD_CONTENT_CHUNK);
  });

  test('fail to get generated app archive for non existing build', async () => {
    const id = 'NonExistingBuildId';
    const error = new BuildNotFoundError(id);
    downloadMock.mockImplementation(() => {
      throw error;
    });
    await request(app.getHttpServer())
      .get(`/generated-apps/${id}.zip`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message,
        error: 'Not Found'
      });
  });

  test('fail to get generated app archive for non existing build', async () => {
    const error = new BuildResultNotFound(EXAMPLE_BUILD_ID);
    downloadMock.mockImplementation(() => {
      throw error;
    });
    await request(app.getHttpServer())
      .get(`/generated-apps/${EXAMPLE_BUILD_ID}.zip`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message,
        error: 'Not Found'
      });
  });

  test('fail to get generated app archive for an incomplete build', async () => {
    const error = new BuildNotCompleteError(
      EXAMPLE_BUILD_ID,
      EnumBuildStatus.Running
    );
    downloadMock.mockImplementation(() => {
      throw error;
    });
    await request(app.getHttpServer())
      .get(`/generated-apps/${EXAMPLE_BUILD_ID}.zip`)
      .expect(HttpStatus.BAD_REQUEST)
      .expect({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        error: 'Bad Request'
      });
  });
});
