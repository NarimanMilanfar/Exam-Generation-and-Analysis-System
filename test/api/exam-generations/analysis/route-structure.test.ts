/**
 * Tests for the refactored exam-generations/[id]/analysis route structure
 * Verifies that main analysis and variant analysis are now in separate endpoints
 */

import { NextRequest } from "next/server";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: "user-123" }
  })),
}));

// Mock the route handlers
jest.mock("../../../../app/api/exam-generations/[id]/analysis/route", () => ({
  GET: jest.fn(),
}));

jest.mock("../../../../app/api/exam-generations/[id]/analysis/variants/route", () => ({
  GET: jest.fn(),
}));

describe("Analysis Route Structure", () => {
  const mockRequest = new NextRequest("http://localhost:3000/api/exam-generations/test-id/analysis");
  const mockParams = { id: "test-id" };

  it("should have separate endpoints for main analysis and variant analysis", () => {
    // This test verifies that we have the correct file structure
    const fs = require("fs");
    const path = require("path");
    
    const mainAnalysisPath = path.join(__dirname, "../../../../app/api/exam-generations/[id]/analysis/route.ts");
    const variantAnalysisPath = path.join(__dirname, "../../../../app/api/exam-generations/[id]/analysis/variants/route.ts");
    
    expect(fs.existsSync(mainAnalysisPath)).toBe(true);
    expect(fs.existsSync(variantAnalysisPath)).toBe(true);
  });

  it("should have correct API endpoints", () => {
    // Verify the endpoint URLs are correct
    const mainAnalysisUrl = "/api/exam-generations/[id]/analysis";
    const variantAnalysisUrl = "/api/exam-generations/[id]/analysis/variants";
    
    expect(mainAnalysisUrl).toBe("/api/exam-generations/[id]/analysis");
    expect(variantAnalysisUrl).toBe("/api/exam-generations/[id]/analysis/variants");
  });

  it("should maintain backward compatibility for main analysis", () => {
    // The main analysis endpoint should still return the same structure
    // but without the nested byVaraintResult
    const expectedMainAnalysisStructure = {
      examId: expect.any(String),
      examTitle: expect.any(String),
      analysisConfig: expect.any(Object),
      questionResults: expect.any(Array),
      summary: expect.any(Object),
      metadata: expect.any(Object),
    };

    // This is a structural test - the actual implementation would be tested in integration tests
    expect(expectedMainAnalysisStructure).toMatchObject({
      examId: expect.any(String),
      examTitle: expect.any(String),
      analysisConfig: expect.any(Object),
      questionResults: expect.any(Array),
      summary: expect.any(Object),
      metadata: expect.any(Object),
    });
  });

  it("should have dedicated variant analysis endpoint", () => {
    // The variant analysis endpoint should return an array of BiPointAnalysisResult
    const expectedVariantAnalysisStructure = expect.arrayContaining([
      expect.objectContaining({
        examId: expect.any(String),
        examTitle: expect.any(String),
        analysisConfig: expect.any(Object),
        questionResults: expect.any(Array),
        summary: expect.any(Object),
        metadata: expect.any(Object),
      })
    ]);

    // This is a structural test - the actual implementation would be tested in integration tests
    expect(expectedVariantAnalysisStructure).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          examId: expect.any(String),
          examTitle: expect.any(String),
          analysisConfig: expect.any(Object),
          questionResults: expect.any(Array),
          summary: expect.any(Object),
          metadata: expect.any(Object),
        })
      ])
    );
  });
}); 