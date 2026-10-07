import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Code2,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { marked } from 'marked';

interface TestCase {
  title: string;
  input: string;
  output: string;
  explanation?: string;
}

interface ParsedProblem {
  title: string;
  domain?: string;
  difficulty?: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  complexity?: string;
  publicTestCases: TestCase[];
  rawPublicCasesText?: string;
  candidateRequirement?: string;
}

function parseMarkdownProblem(text: string): ParsedProblem | null {
  if (!text) return null;

  // Check whether this question follows the structured coding problem format
  const hasStatement = /##\s*Problem Statement/i.test(text);
  const hasInput = /##\s*Input Format/i.test(text);
  const hasOutput = /##\s*Output Format/i.test(text);

  if (!hasStatement && !hasInput && !hasOutput) {
    return null; // Fallback to universal markdown renderer
  }

  const data: ParsedProblem = {
    title: '',
    domain: '',
    difficulty: '',
    statement: '',
    inputFormat: '',
    outputFormat: '',
    constraints: [],
    complexity: '',
    publicTestCases: [],
    candidateRequirement: '',
  };

  // Title: match ### Q1. Title or ### Title
  const mTitle = text.match(/#+\s*(?:Q\d+[\.:]?\s*)?([^\n]+)/i);
  if (mTitle) {
    data.title = mTitle[1]
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .trim();
  }

  // Domain & Difficulty
  const mDom = text.match(/\*\*Domain:\*\*\s*([^\n]+)/i);
  if (mDom) data.domain = mDom[1].replace(/\*\*/g, '').trim();

  const mDiff = text.match(/\*\*Difficulty:\*\*\s*([^\n]+)/i);
  if (mDiff) data.difficulty = mDiff[1].replace(/\*\*/g, '').trim();

  // Problem Statement
  const mStmt = text.match(/##\s*Problem Statement\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mStmt) data.statement = mStmt[1].trim();

  // Input Format
  const mIn = text.match(/##\s*Input Format\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mIn) data.inputFormat = mIn[1].trim();

  // Output Format
  const mOut = text.match(/##\s*Output Format\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mOut) data.outputFormat = mOut[1].trim();

  // Constraints
  const mConst = text.match(/##\s*Constraints\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mConst) {
    const rawLines = mConst[1].split('\n');
    data.constraints = rawLines
      .map((l) => l.trim().replace(/^[-*•]\s*/, '').trim())
      .filter((l) => l.length > 0);
  }

  // Expected Complexity
  const mComp = text.match(/##\s*Expected Complexity\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mComp) {
    data.complexity = mComp[1].replace(/^Expected\s*/i, '').trim();
  }

  // Public Test Cases
  const mPub = text.match(/##\s*Public Test Cases\s*\n([\s\S]*?)(?=\n##\s*Hidden|\n##\s*Candidate|\Z)/i);
  if (mPub) {
    const pubText = mPub[1];
    const caseChunks = pubText.split(/###\s*(?:Public Test Case|Example|Case)\s*\d+/i);
    caseChunks.slice(1).forEach((chunk, idx) => {
      const tc: TestCase = {
        title: `Example ${idx + 1}`,
        input: '',
        output: '',
        explanation: '',
      };

      const mInp = chunk.match(/\*?\*?Input:?\*?\*?\s*```[a-zA-Z]*\n?([\s\S]*?)```/i);
      if (mInp) tc.input = mInp[1].trim();

      const mOutp =
        chunk.match(/\*?\*?Expected Output:?\*?\*?\s*```[a-zA-Z]*\n?([\s\S]*?)```/i) ||
        chunk.match(/\*?\*?Output:?\*?\*?\s*```[a-zA-Z]*\n?([\s\S]*?)```/i);
      if (mOutp) tc.output = mOutp[1].trim();

      const mExp = chunk.match(/\*?\*?Explanation:?\*?\*?\s*([\s\S]*?)(?=\n\*\*|\Z)/i);
      if (mExp) tc.explanation = mExp[1].trim();

      if (tc.input || tc.output) {
        data.publicTestCases.push(tc);
      }
    });

    if (data.publicTestCases.length === 0 && pubText.trim().length > 0) {
      data.rawPublicCasesText = pubText.trim();
    }
  }

  // Candidate Requirement
  const mReq = text.match(/(?:##\s*(?:Candidate Requirement|Candidate Guidelines|Instructions))\s*\n([\s\S]*?)(?=\n##|\Z)/i);
  if (mReq) {
    data.candidateRequirement = mReq[1].trim();
  }

  return data;
}

interface CodingProblemViewProps {
  questionText: string;
  category?: string;
  difficulty?: string;
  marks?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export const CodingProblemView: React.FC<CodingProblemViewProps> = ({
  questionText,
  category,
  difficulty,
  marks,
  questionNumber,
  totalQuestions,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const parsed = parseMarkdownProblem(questionText);

  // If question is not in standard structured format, fallback to styled markdown rendering
  if (!parsed) {
    const rawHtml = marked.parse(questionText || '') as string;
    return (
      <div
        className="coding-markdown-view space-y-4 text-slate-800 text-sm leading-relaxed bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  }

  const effectiveDifficulty = parsed.difficulty || difficulty || 'Medium';
  const effectiveCategory = parsed.domain || category;

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Problem Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {questionNumber !== undefined && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm">
              Problem {questionNumber} {totalQuestions ? `of ${totalQuestions}` : ''}
            </span>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getDifficultyColor(
              effectiveDifficulty
            )}`}
          >
            {effectiveDifficulty}
          </span>
          {effectiveCategory && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <Layers className="h-3 w-3 mr-1 text-sky-600" />
              {effectiveCategory}
            </span>
          )}
          {marks !== undefined && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              <Cpu className="h-3 w-3 mr-1 text-indigo-600" />
              {marks} Marks
            </span>
          )}
          {parsed.complexity && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Zap className="h-3 w-3 mr-1 text-amber-500" />
              {parsed.complexity}
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
          {parsed.title || `Coding Problem ${questionNumber || ''}`}
        </h1>
      </div>

      {/* Problem Statement Card */}
      {parsed.statement && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BookOpen className="h-4 w-4 text-sky-600" />
            <span>Problem Description</span>
          </div>
          <div
            className="coding-markdown-view text-slate-800 text-sm sm:text-base leading-relaxed font-normal"
            dangerouslySetInnerHTML={{ __html: marked.parse(parsed.statement) as string }}
          />
        </div>
      )}

      {/* Input & Output Format Specifications */}
      {(parsed.inputFormat || parsed.outputFormat) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parsed.inputFormat && (
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <span className="mr-1.5 text-base">📥</span> Input Format
              </span>
              <div
                className="coding-markdown-view text-xs sm:text-sm text-slate-700 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{ __html: marked.parse(parsed.inputFormat) as string }}
              />
            </div>
          )}

          {parsed.outputFormat && (
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <span className="mr-1.5 text-base">📤</span> Output Format
              </span>
              <div
                className="coding-markdown-view text-xs sm:text-sm text-slate-700 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{ __html: marked.parse(parsed.outputFormat) as string }}
              />
            </div>
          )}
        </div>
      )}

      {/* Constraints */}
      {parsed.constraints && parsed.constraints.length > 0 && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-4 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span>Constraints & Bounds</span>
          </div>
          <ul className="space-y-2 pl-1">
            {parsed.constraints.map((c, i) => (
              <li key={i} className="text-xs sm:text-sm text-amber-950 flex items-start space-x-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span
                  className="coding-markdown-view flex-1"
                  dangerouslySetInnerHTML={{ __html: marked.parseInline(c) as string }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sample / Public Test Cases */}
      {parsed.publicTestCases && parsed.publicTestCases.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Terminal className="h-4 w-4 text-sky-600" />
              <span>Sample Test Cases ({parsed.publicTestCases.length} Examples)</span>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              Click Copy to test against your local code
            </span>
          </div>

          <div className="space-y-4">
            {parsed.publicTestCases.map((tc, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Example Header */}
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800">{tc.title}</span>
                  </div>
                </div>

                {/* Input / Output 2-column or stacked */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Input Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Input:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tc.input, `in-${idx}`)}
                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                        title="Copy Input"
                      >
                        {copiedKey === `in-${idx}` ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-slate-900 text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-slate-800 overflow-x-auto selection:bg-emerald-900 selection:text-white leading-relaxed">
                      {tc.input}
                    </pre>
                  </div>

                  {/* Output Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Expected Output:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tc.output, `out-${idx}`)}
                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                        title="Copy Output"
                      >
                        {copiedKey === `out-${idx}` ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-slate-900 text-cyan-300 font-mono text-xs p-3.5 rounded-xl border border-slate-800 overflow-x-auto selection:bg-cyan-900 selection:text-white leading-relaxed">
                      {tc.output}
                    </pre>
                  </div>
                </div>

                {/* Explanation */}
                {tc.explanation && (
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
                    <strong className="text-slate-800">Explanation: </strong>
                    {tc.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw test cases fallback if structured chunks weren't matched */}
      {parsed.rawPublicCasesText && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Terminal className="h-4 w-4 text-sky-600" />
            <span>Sample Test Cases</span>
          </div>
          <div
            className="coding-markdown-view text-xs sm:text-sm text-slate-800"
            dangerouslySetInnerHTML={{ __html: marked.parse(parsed.rawPublicCasesText) as string }}
          />
        </div>
      )}

      {/* Candidate Requirement / Assessment Guidelines Notice */}
      <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl flex items-start space-x-3 text-xs sm:text-sm text-sky-950">
        <Code2 className="h-5 w-5 text-sky-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sky-900 block">Assessment Guidelines:</span>
          <p className="text-sky-900/80 leading-relaxed text-xs">
            {parsed.candidateRequirement ||
              'Implement your solution locally in VS Code or your preferred IDE. Ensure all public test cases pass and edge constraints are handled before uploading your source file below.'}
          </p>
        </div>
      </div>
    </div>
  );
};
