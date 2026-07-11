import { RadarChart } from "@/components/radar/RadarChart";
import { BOOKS } from "@/data/books";
import { DOMAINS, LEARNING_PATH, RINGS, getDomainById, getRingById } from "@/lib/constants";

const featuredBookIds = new Set(LEARNING_PATH.flatMap((step) => step.bookIds));
const featuredBooks = BOOKS.filter((book) => featuredBookIds.has(book.id));

function getBooksByIds(bookIds: string[]) {
  return bookIds
    .map((bookId) => BOOKS.find((book) => book.id === bookId))
    .filter((book): book is (typeof BOOKS)[number] => Boolean(book));
}

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12">
        <section className="max-w-[760px]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#E63946]">
            初版样例 / 持续维护中
          </p>
          <h1 className="mb-5 text-[#F7F7F8]">AI-Native 读书雷达</h1>
          <p className="max-w-[680px] text-base leading-7 text-[#E5E7EB]">
            这不是普通书单，而是一张 AI 学习认知地图。它把代表性书籍放入知识领域和学习阶段中，帮助你先建立结构，再决定从哪里开始读、下一步补什么。
          </p>
        </section>

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,680px)_minmax(320px,1fr)]">
          <div className="min-w-0">
            <RadarChart />
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-[#F7F7F8]">如何读这张雷达</h2>
              <dl className="grid gap-3 text-sm leading-6 text-[#E5E7EB]">
                <div className="border-l border-[#E5E7EB]/25 pl-4">
                  <dt className="font-semibold text-[#F7F7F8]">颜色 = 知识领域</dt>
                  <dd className="text-[#9CA3AF]">不同颜色代表 AI 学习中的不同认知方向。</dd>
                </div>
                <div className="border-l border-[#E5E7EB]/25 pl-4">
                  <dt className="font-semibold text-[#F7F7F8]">圈层 = 学习阶段</dt>
                  <dd className="text-[#9CA3AF]">越靠近中心越适合作为起点，越靠外越偏进阶。</dd>
                </div>
                <div className="border-l border-[#E5E7EB]/25 pl-4">
                  <dt className="font-semibold text-[#F7F7F8]">点 = 代表性书籍</dt>
                  <dd className="text-[#9CA3AF]">每个点是一本文本样例，位置表达它的领域和阶段。</dd>
                </div>
                <div className="border-l border-[#E5E7EB]/25 pl-4">
                  <dt className="font-semibold text-[#F7F7F8]">透明度 = 推荐强度</dt>
                  <dd className="text-[#9CA3AF]">透明度越高，表示当前样例中的推荐强度越高。</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="mb-4 text-[#F7F7F8]">学习阶段</h2>
              <div className="grid gap-3">
                {RINGS.map((ring) => (
                  <div key={ring.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-2 h-px w-8 shrink-0 bg-[#E5E7EB]/60" />
                    <div>
                      <p className="font-semibold text-[#F7F7F8]">{ring.name}</p>
                      <p className="leading-6 text-[#9CA3AF]">{ring.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-[720px]">
            <h2 className="mb-3 text-[#F7F7F8]">默认学习路径</h2>
            <p className="text-sm leading-6 text-[#9CA3AF]">
              第一阶段先提供一条统一路径，不根据岗位或基础自动个性化。它用于回答“从哪里开始”和“下一步学什么”。
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {LEARNING_PATH.map((step) => (
              <article key={step.id} className="border border-[#E5E7EB]/20 bg-[#F7F7F8]/[0.03] p-5">
                <p className="mb-3 text-xs font-semibold text-[#E63946]">{step.stage}</p>
                <h3 className="mb-3 text-[#F7F7F8]">{step.title}</h3>
                <p className="mb-5 text-sm leading-6 text-[#9CA3AF]">{step.description}</p>
                <ul className="space-y-4">
                  {getBooksByIds(step.bookIds).map((book) => {
                    const domain = getDomainById(book.domainId);
                    const ring = getRingById(book.ringId);

                    return (
                      <li key={book.id} className="border-t border-[#E5E7EB]/15 pt-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                          {domain ? (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: domain.color }}
                              />
                              {domain.name}
                            </span>
                          ) : null}
                          {ring ? <span>{ring.name}</span> : null}
                          <span>推荐指数 {book.rating}/5</span>
                        </div>
                        <p className="font-semibold leading-6 text-[#F7F7F8]">{book.title}</p>
                        <p className="mb-2 text-xs leading-5 text-[#9CA3AF]">{book.author}</p>
                        <p className="text-sm leading-6 text-[#D1D5DB]">{book.reason}</p>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-[720px]">
            <h2 className="mb-3 text-[#F7F7F8]">当前领域假设</h2>
            <p className="text-sm leading-6 text-[#9CA3AF]">
              领域分类以产品总上下文为基线，仍属于当前阶段假设。后续会继续验证分类是否重叠、是否完整，以及某些趋势内容更适合作为领域还是标签。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((domain) => (
              <article key={domain.id} className="border border-[#E5E7EB]/15 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: domain.color }} />
                  <h3 className="text-base text-[#F7F7F8]">{domain.name}</h3>
                </div>
                <p className="text-sm leading-6 text-[#9CA3AF]">{domain.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-[720px]">
            <h2 className="mb-3 text-[#F7F7F8]">为什么推荐这些书</h2>
            <p className="text-sm leading-6 text-[#9CA3AF]">
              以下书籍来自当前样例数据，用于展示认知地图如何解释推荐理由。正式雷达内容仍应经过专业判断和运营审核。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featuredBooks.map((book) => {
              const domain = getDomainById(book.domainId);
              const ring = getRingById(book.ringId);

              return (
                <article key={book.id} className="border border-[#E5E7EB]/15 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                    {domain ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: domain.color }} />
                        {domain.name}
                      </span>
                    ) : null}
                    {ring ? <span>{ring.name}</span> : null}
                    <span>推荐指数 {book.rating}/5</span>
                  </div>
                  <h3 className="mb-1 text-[#F7F7F8]">{book.title}</h3>
                  <p className="mb-3 text-sm text-[#9CA3AF]">{book.author}</p>
                  <p className="text-sm leading-6 text-[#D1D5DB]">{book.reason}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
