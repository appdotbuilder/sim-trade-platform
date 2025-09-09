import { db } from '../db';
import { educationalContentTable } from '../db/schema';
import { type EducationalContent } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getEducationalContent(): Promise<EducationalContent[]> {
  try {
    const results = await db.select()
      .from(educationalContentTable)
      .orderBy(desc(educationalContentTable.created_at))
      .execute();

    return results.map(content => ({
      ...content,
      duration: content.duration || 0,
      view_count: content.view_count || 0
    }));
  } catch (error) {
    console.error('Failed to fetch educational content:', error);
    throw error;
  }
}

export async function getFeaturedContent(): Promise<EducationalContent[]> {
  try {
    const results = await db.select()
      .from(educationalContentTable)
      .where(eq(educationalContentTable.is_featured, true))
      .orderBy(desc(educationalContentTable.view_count))
      .execute();

    return results.map(content => ({
      ...content,
      duration: content.duration || 0,
      view_count: content.view_count || 0
    }));
  } catch (error) {
    console.error('Failed to fetch featured content:', error);
    throw error;
  }
}

export async function getContentByCategory(category: string): Promise<EducationalContent[]> {
  try {
    const results = await db.select()
      .from(educationalContentTable)
      .where(eq(educationalContentTable.category, category))
      .orderBy(desc(educationalContentTable.created_at))
      .execute();

    return results.map(content => ({
      ...content,
      duration: content.duration || 0,
      view_count: content.view_count || 0
    }));
  } catch (error) {
    console.error('Failed to fetch content by category:', error);
    throw error;
  }
}

export async function getContentByLevel(level: 'beginner' | 'intermediate' | 'advanced'): Promise<EducationalContent[]> {
  try {
    const results = await db.select()
      .from(educationalContentTable)
      .where(eq(educationalContentTable.level, level))
      .orderBy(desc(educationalContentTable.created_at))
      .execute();

    return results.map(content => ({
      ...content,
      duration: content.duration || 0,
      view_count: content.view_count || 0
    }));
  } catch (error) {
    console.error('Failed to fetch content by level:', error);
    throw error;
  }
}