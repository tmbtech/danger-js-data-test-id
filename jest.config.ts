import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  roots: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
