#!/usr/bin/env node

import {execute} from '@oclif/core'

(async () => {
  try {
    await execute({dir: import.meta.url})
  } catch (error) {
    console.error('Mastro execution failed:', error)
    process.exit(1)
  }
})()