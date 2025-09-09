import { db } from '../db';
import { educationalContentTable } from '../db/schema';
import { type CreateEducationalContentInput, type EducationalContent } from '../schema';

export const createEducationalContent = async (input: CreateEducationalContentInput): Promise<EducationalContent> => {
  try {
    // Insert educational content record
    const result = await db.insert(educationalContentTable)
      .values({
        title: input.title,
        description: input.description ?? null,
        video_url: input.video_url,
        thumbnail_url: input.thumbnail_url ?? null,
        duration: input.duration ?? null,
        category: input.category,
        level: input.level,
        is_featured: false, // Default value
        view_count: 0 // Default value
      })
      .returning()
      .execute();

    const content = result[0];
    return {
      ...content,
      // No numeric conversions needed - all fields are already in correct format
    };
  } catch (error) {
    console.error('Educational content creation failed:', error);
    throw error;
  }
};