import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SeoHead } from "@/components/SeoHead";
import { ArrowRight, HardHat, Handshake } from "lucide-react";
import { blogPostsBySlug } from "@/generated/blog-manifest";

/**
 * Single blog post. Title/meta/canonical are SeoHead-managed for JS-aware
 * crawlers; the build-time prerender bakes the same tags + full article HTML
 * into dist/blog/<slug>/index.html for crawlers that don't run JS.
 */
const BlogPost = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  const post = blogPostsBySlug[slug];

  if (!post) {
    return (
      <main className="min-h-screen w-full bg-background">
        <SeoHead
          title="Post not found — BuilderSuite ML Blog"
          description="That blog post couldn't be found."
          path={`/blog/${slug}`}
        />
        <PublicHeader onGetStartedClick={() => setIsPathModalOpen(true)} />
        <section className="py-24 text-center">
          <h1 className="text-3xl font-bold mb-3">Post not found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find that post.
          </p>
          <Link to="/blog" className="text-primary hover:underline">
            Back to the blog
          </Link>
        </section>
        <PublicFooter />
      </main>
    );
  }

  const url = `https://buildersuiteml.com/blog/${post.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: "BuilderSuite ML",
        logo: {
          "@type": "ImageObject",
          url: "https://buildersuiteml.com/og/home.jpg",
        },
      },
      image: `https://buildersuiteml.com${post.ogImage}`,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://buildersuiteml.com/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://buildersuiteml.com/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <main className="min-h-screen w-full bg-background">
      <SeoHead
        title={`${post.title} | BuilderSuite ML`}
        description={post.description}
        path={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.ogImage}
        jsonLd={jsonLd}
      />

      <PublicHeader onGetStartedClick={() => setIsPathModalOpen(true)} />

      <Dialog open={isPathModalOpen} onOpenChange={setIsPathModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-center text-2xl font-bold">
            Which best describes you?
          </DialogTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate("/auth?tab=signup")}
            >
              <CardHeader className="text-center pb-2">
                <HardHat className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">I'm a Home Builder</CardTitle>
                <CardDescription>General Contractor or Remodel Contractor</CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate("/auth/marketplace")}
            >
              <CardHeader className="text-center pb-2">
                <Handshake className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">I'm a Subcontractor</CardTitle>
                <CardDescription>Vendor, Supplier, or Service Provider</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <article className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
          </nav>

          <header className="mb-8 space-y-3">
            <div className="text-sm text-muted-foreground">
              <time dateTime={post.date}>{post.dateFormatted}</time>
              <span> · By {post.author}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">{post.title}</h1>
            <p className="text-lg md:text-xl text-muted-foreground">{post.description}</p>
          </header>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:text-left prose-th:p-2 prose-td:p-2 prose-th:border-b prose-td:border-b"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Try BuilderSuite ML free</h2>
              <p className="text-sm text-muted-foreground">
                Your first three projects are on us — full access, no credit card.
              </p>
            </div>
            <Button size="lg" onClick={() => setIsPathModalOpen(true)}>
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="mt-8">
            <Link to="/blog" className="text-sm text-primary hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </div>
      </article>

      <PublicFooter />
    </main>
  );
};

export default BlogPost;
