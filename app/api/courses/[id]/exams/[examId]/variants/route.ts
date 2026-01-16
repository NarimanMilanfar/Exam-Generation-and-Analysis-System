import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; examId: string } }
) {
  try {
    const { id: courseId, examId } = params;
    const body = await request.json();

    const {
      numberOfVariants,
      randomizeQuestionOrder,
      randomizeOptionOrder,
      randomizeTrueFalseOptions,
    } = body;

    // Validate input
    if (!numberOfVariants || numberOfVariants < 1 || numberOfVariants > 10) {
      return NextResponse.json(
        { error: "Number of variants must be between 1 and 10" },
        { status: 400 }
      );
    }

    // For now, return a success response with the configuration
    // The actual variant generation will be handled in the frontend
    const variants = Array.from({ length: numberOfVariants }, (_, i) => ({
      id: `variant_${examId}_${i + 1}`,
      variantCode: `V${i + 1}`,
      questionCount: 0, // Will be populated by frontend
      totalPoints: 0,
    }));

    return NextResponse.json({
      success: true,
      variantsGenerated: numberOfVariants,
      variants,
      config: {
        numberOfVariants,
        randomizeQuestionOrder,
        randomizeOptionOrder,
        randomizeTrueFalseOptions,
        examId,
        courseId,
      },
    });
  } catch (error) {
    console.error("Error generating exam variants:", error);
    return NextResponse.json(
      { error: "Failed to generate exam variants" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; examId: string } }
) {
  try {
    const { id: courseId, examId } = params;

    // Return empty variants for now - variants will be generated on demand
    return NextResponse.json({
      variants: [],
      examId,
      courseId,
    });
  } catch (error) {
    console.error("Error fetching exam variants:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam variants" },
      { status: 500 }
    );
  }
}
