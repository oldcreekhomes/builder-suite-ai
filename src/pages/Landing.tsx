
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Calendar, CheckCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">BuilderSuite AI</span>
            </div>
            <div className="flex space-x-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Streamline Your
            <span className="text-blue-600"> Construction Projects</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The all-in-one platform for home builders to manage projects, teams, photos, and schedules. 
            Built with AI to make construction management effortless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="px-8 py-4 text-lg">
                Start Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Build Better
            </h2>
            <p className="text-xl text-gray-600">
              Powerful tools designed specifically for construction professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6">
              <CardHeader>
                <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Project Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Organize and track all your construction projects in one centralized dashboard
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Invite employees, manage roles, and collaborate seamlessly across your organization
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardHeader>
                <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Document Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Store, organize, and share project files, photos, and documents securely
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardHeader>
                <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Schedule Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Keep projects on track with powerful scheduling and timeline management tools
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose BuilderSuite AI?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Designed for Builders</h3>
                    <p className="text-gray-600">Built specifically for construction workflows and processes</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">AI-Powered Insights</h3>
                    <p className="text-gray-600">Smart automation and insights to improve project efficiency</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Easy to Use</h3>
                    <p className="text-gray-600">Intuitive interface that your team will actually want to use</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure & Reliable</h3>
                    <p className="text-gray-600">Enterprise-grade security to protect your project data</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-center mb-6">
                <Star className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900">Ready to Get Started?</h3>
                <p className="text-gray-600 mt-2">Join thousands of builders already using BuilderSuite AI</p>
              </div>
              <Link to="/auth" className="w-full">
                <Button size="lg" className="w-full">
                  Start Your Free Trial
                </Button>
              </Link>
              <p className="text-sm text-gray-500 text-center mt-4">
                No credit card required • 14-day free trial
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-lg font-bold">BuilderSuite AI</span>
              </div>
              <p className="text-gray-400">
                The complete construction management platform for modern builders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Demo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Help Center</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BuilderSuite AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
