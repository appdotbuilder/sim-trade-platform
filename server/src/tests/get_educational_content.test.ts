import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { educationalContentTable } from '../db/schema';
import { type CreateEducationalContentInput } from '../schema';
import { 
  getEducationalContent, 
  getFeaturedContent, 
  getContentByCategory, 
  getContentByLevel 
} from '../handlers/get_educational_content';

// Test data
const testContent1: CreateEducationalContentInput = {
  title: 'Introduction to Trading',
  description: 'Learn the basics of trading',
  video_url: 'https://example.com/video1',
  thumbnail_url: 'https://example.com/thumb1.jpg',
  duration: 600,
  category: 'trading_basics',
  level: 'beginner'
};

const testContent2: CreateEducationalContentInput = {
  title: 'Advanced Chart Analysis',
  description: 'Master technical analysis',
  video_url: 'https://example.com/video2',
  thumbnail_url: 'https://example.com/thumb2.jpg',
  duration: 1200,
  category: 'technical_analysis',
  level: 'advanced'
};

const testContent3: CreateEducationalContentInput = {
  title: 'Risk Management Strategies',
  description: 'Learn to manage trading risks',
  video_url: 'https://example.com/video3',
  thumbnail_url: null,
  duration: 900,
  category: 'risk_management',
  level: 'intermediate'
};

describe('getEducationalContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getEducationalContent', () => {
    it('should return all educational content ordered by created_at desc', async () => {
      // Create test content with explicit timing
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          is_featured: false,
          view_count: 100
        })
        .execute();

      // Small delay to ensure different created_at timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await db.insert(educationalContentTable)
        .values({
          ...testContent2,
          is_featured: true,
          view_count: 250
        })
        .execute();

      const results = await getEducationalContent();

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Advanced Chart Analysis');
      expect(results[1].title).toEqual('Introduction to Trading');
      
      // Verify all fields are properly returned
      expect(results[0].duration).toEqual(1200);
      expect(results[0].view_count).toEqual(250);
      expect(typeof results[0].duration).toBe('number');
      expect(typeof results[0].view_count).toBe('number');
    });

    it('should return empty array when no content exists', async () => {
      const results = await getEducationalContent();
      expect(results).toHaveLength(0);
    });

    it('should handle null duration and view_count fields', async () => {
      await db.insert(educationalContentTable)
        .values({
          title: 'Test Content',
          description: null,
          video_url: 'https://example.com/test',
          thumbnail_url: null,
          duration: null,
          category: 'test',
          level: 'beginner',
          is_featured: false,
          view_count: 0
        })
        .execute();

      const results = await getEducationalContent();

      expect(results).toHaveLength(1);
      expect(results[0].duration).toEqual(0);
      expect(results[0].view_count).toEqual(0);
    });
  });

  describe('getFeaturedContent', () => {
    it('should return only featured content ordered by view_count desc', async () => {
      // Create mix of featured and non-featured content
      await db.insert(educationalContentTable)
        .values([
          {
            ...testContent1,
            is_featured: false,
            view_count: 500
          },
          {
            ...testContent2,
            is_featured: true,
            view_count: 100
          },
          {
            ...testContent3,
            is_featured: true,
            view_count: 300
          }
        ])
        .execute();

      const results = await getFeaturedContent();

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Risk Management Strategies');
      expect(results[0].view_count).toEqual(300);
      expect(results[1].title).toEqual('Advanced Chart Analysis');
      expect(results[1].view_count).toEqual(100);
      
      // Verify all returned content is featured
      results.forEach(content => {
        expect(content.is_featured).toBe(true);
      });
    });

    it('should return empty array when no featured content exists', async () => {
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          is_featured: false,
          view_count: 100
        })
        .execute();

      const results = await getFeaturedContent();
      expect(results).toHaveLength(0);
    });
  });

  describe('getContentByCategory', () => {
    it('should return content filtered by category ordered by created_at desc', async () => {
      // Create content with explicit timing
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          category: 'trading_basics',
          is_featured: false,
          view_count: 100
        })
        .execute();

      await db.insert(educationalContentTable)
        .values({
          ...testContent2,
          category: 'technical_analysis',
          is_featured: false,
          view_count: 200
        })
        .execute();

      await new Promise(resolve => setTimeout(resolve, 10));

      await db.insert(educationalContentTable)
        .values({
          ...testContent3,
          category: 'trading_basics',
          is_featured: false,
          view_count: 150
        })
        .execute();

      const results = await getContentByCategory('trading_basics');

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Risk Management Strategies');
      expect(results[1].title).toEqual('Introduction to Trading');
      
      // Verify all returned content matches category
      results.forEach(content => {
        expect(content.category).toEqual('trading_basics');
      });
    });

    it('should return empty array for non-existent category', async () => {
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          is_featured: false,
          view_count: 100
        })
        .execute();

      const results = await getContentByCategory('non_existent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getContentByLevel', () => {
    it('should return content filtered by level ordered by created_at desc', async () => {
      // Create content with explicit timing
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          level: 'beginner',
          is_featured: false,
          view_count: 100
        })
        .execute();

      await db.insert(educationalContentTable)
        .values({
          ...testContent2,
          level: 'advanced',
          is_featured: false,
          view_count: 200
        })
        .execute();

      await new Promise(resolve => setTimeout(resolve, 10));

      await db.insert(educationalContentTable)
        .values({
          ...testContent3,
          level: 'beginner',
          is_featured: false,
          view_count: 150
        })
        .execute();

      const results = await getContentByLevel('beginner');

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Risk Management Strategies');
      expect(results[1].title).toEqual('Introduction to Trading');
      
      // Verify all returned content matches level
      results.forEach(content => {
        expect(content.level).toEqual('beginner');
      });
    });

    it('should work with all level types', async () => {
      await db.insert(educationalContentTable)
        .values([
          {
            ...testContent1,
            level: 'beginner',
            is_featured: false,
            view_count: 100
          },
          {
            ...testContent2,
            level: 'advanced',
            is_featured: false,
            view_count: 200
          },
          {
            ...testContent3,
            level: 'intermediate',
            is_featured: false,
            view_count: 150
          }
        ])
        .execute();

      const beginnerResults = await getContentByLevel('beginner');
      const intermediateResults = await getContentByLevel('intermediate');
      const advancedResults = await getContentByLevel('advanced');

      expect(beginnerResults).toHaveLength(1);
      expect(beginnerResults[0].level).toEqual('beginner');
      
      expect(intermediateResults).toHaveLength(1);
      expect(intermediateResults[0].level).toEqual('intermediate');
      
      expect(advancedResults).toHaveLength(1);
      expect(advancedResults[0].level).toEqual('advanced');
    });

    it('should return empty array for level with no content', async () => {
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          level: 'beginner',
          is_featured: false,
          view_count: 100
        })
        .execute();

      const results = await getContentByLevel('advanced');
      expect(results).toHaveLength(0);
    });
  });

  describe('data integrity', () => {
    it('should return complete educational content objects', async () => {
      await db.insert(educationalContentTable)
        .values({
          ...testContent1,
          is_featured: true,
          view_count: 250
        })
        .execute();

      const results = await getEducationalContent();
      const content = results[0];

      expect(content.id).toBeDefined();
      expect(content.title).toEqual('Introduction to Trading');
      expect(content.description).toEqual('Learn the basics of trading');
      expect(content.video_url).toEqual('https://example.com/video1');
      expect(content.thumbnail_url).toEqual('https://example.com/thumb1.jpg');
      expect(content.duration).toEqual(600);
      expect(content.category).toEqual('trading_basics');
      expect(content.level).toEqual('beginner');
      expect(content.is_featured).toBe(true);
      expect(content.view_count).toEqual(250);
      expect(content.created_at).toBeInstanceOf(Date);
      expect(content.updated_at).toBeInstanceOf(Date);
    });
  });
});