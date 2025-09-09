import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { educationalContentTable } from '../db/schema';
import { type CreateEducationalContentInput } from '../schema';
import { createEducationalContent } from '../handlers/create_educational_content';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateEducationalContentInput = {
  title: 'Crypto Trading Basics',
  description: 'Learn the fundamentals of cryptocurrency trading',
  video_url: 'https://example.com/video.mp4',
  thumbnail_url: 'https://example.com/thumb.jpg',
  duration: 1800,
  category: 'Trading',
  level: 'beginner'
};

describe('createEducationalContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create educational content', async () => {
    const result = await createEducationalContent(testInput);

    // Basic field validation
    expect(result.title).toEqual('Crypto Trading Basics');
    expect(result.description).toEqual('Learn the fundamentals of cryptocurrency trading');
    expect(result.video_url).toEqual('https://example.com/video.mp4');
    expect(result.thumbnail_url).toEqual('https://example.com/thumb.jpg');
    expect(result.duration).toEqual(1800);
    expect(result.category).toEqual('Trading');
    expect(result.level).toEqual('beginner');
    expect(result.is_featured).toEqual(false);
    expect(result.view_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save educational content to database', async () => {
    const result = await createEducationalContent(testInput);

    // Query using proper drizzle syntax
    const contents = await db.select()
      .from(educationalContentTable)
      .where(eq(educationalContentTable.id, result.id))
      .execute();

    expect(contents).toHaveLength(1);
    expect(contents[0].title).toEqual('Crypto Trading Basics');
    expect(contents[0].description).toEqual('Learn the fundamentals of cryptocurrency trading');
    expect(contents[0].video_url).toEqual('https://example.com/video.mp4');
    expect(contents[0].thumbnail_url).toEqual('https://example.com/thumb.jpg');
    expect(contents[0].duration).toEqual(1800);
    expect(contents[0].category).toEqual('Trading');
    expect(contents[0].level).toEqual('beginner');
    expect(contents[0].is_featured).toEqual(false);
    expect(contents[0].view_count).toEqual(0);
    expect(contents[0].created_at).toBeInstanceOf(Date);
    expect(contents[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    const minimalInput: CreateEducationalContentInput = {
      title: 'Advanced Trading Strategies',
      video_url: 'https://example.com/advanced.mp4',
      category: 'Advanced',
      level: 'advanced'
    };

    const result = await createEducationalContent(minimalInput);

    expect(result.title).toEqual('Advanced Trading Strategies');
    expect(result.description).toBeNull();
    expect(result.video_url).toEqual('https://example.com/advanced.mp4');
    expect(result.thumbnail_url).toBeNull();
    expect(result.duration).toBeNull();
    expect(result.category).toEqual('Advanced');
    expect(result.level).toEqual('advanced');
    expect(result.is_featured).toEqual(false);
    expect(result.view_count).toEqual(0);
  });

  it('should create content with all education levels', async () => {
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    
    for (const level of levels) {
      const input: CreateEducationalContentInput = {
        title: `${level} Course`,
        video_url: `https://example.com/${level}.mp4`,
        category: 'General',
        level: level
      };

      const result = await createEducationalContent(input);

      expect(result.level).toEqual(level);
      expect(result.title).toEqual(`${level} Course`);
    }
  });

  it('should set default values for required fields', async () => {
    const result = await createEducationalContent(testInput);

    // Verify default values are applied correctly
    expect(result.is_featured).toEqual(false);
    expect(result.view_count).toEqual(0);
    expect(typeof result.view_count).toBe('number');
    expect(typeof result.is_featured).toBe('boolean');
  });
});