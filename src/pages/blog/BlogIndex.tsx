import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SeoHead } from "@/components/SeoHead";
import { HardHat, Handshake } from "lucide-react";
import { blogPosts } from "@/generated/blog-manifest";

/**
 * Blog index. Lists every post from the build-time manifest with real
 * <a href> links so crawlers see the full set without running JS.
 */
const BlogIndex = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "BuilderSuite ML Blog",
    url: "https://buildersuiteml.com/blog",
    description:
      "Construction management insights, product news, and home-builder how-tos from the BuilderSuite ML team.",
    blogPost: blogPosts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://buildersuiteml.com/blog/${p.slug}`,
      datePublished: p.date,
      author: { "@type": "Organization", name: p.author },
    })),
  };

  return (
    <main className="min-h-screen w-full bg-background">
      <SeoHead
        title="Blog — Construction Management Insights | BuilderSuite ML"
        description="Construction management insights, product news, and home-builder how-tos from the BuilderSuite ML team."
        path="/blog"
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

      <section className="py-16 md:py-20 bg-gradient-to-b from-muted to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-sm font-semibold tracking-widest uppercase text-primary">
            BuilderSuite ML Blog
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Insights for Home Builders
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Construction management how-tos, product updates, and lessons learned from working
            home builders.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {blogPosts.length === 0 ? (
            <p className="text-center text-muted-foreground">No posts yet — check back soon.</p>
          ) : (
            blogPosts.map((post) => (
              <Card key={post.slug} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="text-xs text-muted-foreground mb-1">
                    <time dateTime={post.date}>{post.dateFormatted}</time>
                    {post.tags.length > 0 && <span> · {post.tags.join(" · ")}</span>}
                  </div>
                  <CardTitle className="text-2xl">
                    <Link to={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-base">{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Read article →
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default BlogIndex;
