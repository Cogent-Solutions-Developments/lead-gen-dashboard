"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Rocket, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewCampaignPage() {
  const [formData, setFormData] = useState({
    eventName: "",
    eventType: "",
    location: "",
    targetIndustry: "",
    targetRegion: "",
    targetRoles: "",
    icp: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // TODO: Submit to backend
  };

  return (
    <div>
      <Link href="/campaigns" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Campaigns
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Create New Campaign</h1>
      <p className="mb-6 text-slate-500">Set up a new lead generation campaign</p>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Event Details */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Rocket className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Event Details</h2>
                <p className="text-sm text-slate-500">Tell us about your event</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Event Name *
                </label>
                <Input
                  placeholder="e.g., 12th MICT Forum Qatar"
                  value={formData.eventName}
                  onChange={(e) => updateField("eventName", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Event Type *
                </label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => updateField("eventType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="exhibition">Exhibition</SelectItem>
                    <SelectItem value="summit">Summit</SelectItem>
                    <SelectItem value="forum">Forum</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location *
                </label>
                <Input
                  placeholder="e.g., Doha, Qatar"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Target Audience */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Target Audience</h2>
                <p className="text-sm text-slate-500">Define who to reach</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Industry *
                </label>
                <Input
                  placeholder="e.g., Oil & Gas, Energy"
                  value={formData.targetIndustry}
                  onChange={(e) => updateField("targetIndustry", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Region *
                </label>
                <Select
                  value={formData.targetRegion}
                  onValueChange={(value) => updateField("targetRegion", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcc">GCC Countries</SelectItem>
                    <SelectItem value="mena">MENA Region</SelectItem>
                    <SelectItem value="africa">Africa</SelectItem>
                    <SelectItem value="asia">Asia Pacific</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Roles *
                </label>
                <Input
                  placeholder="e.g., Sales Manager, VP Marketing"
                  value={formData.targetRoles}
                  onChange={(e) => updateField("targetRoles", e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* ICP Definition */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">ICP Definition</h2>
                <p className="text-sm text-slate-500">Define your Ideal Customer Profile</p>
              </div>
            </div>

            <Textarea
              placeholder={`Describe your ideal customer profile...

Example:
- Target Companies: Oil & Gas equipment suppliers
- Company Size: 25-5,000+ employees
- Revenue: USD 5M-2B+
- Target Roles: Sales Manager, BD Director, Marketing VP
- Value Proposition: Access to EPC decision-makers, brand visibility`}
              value={formData.icp}
              onChange={(e) => updateField("icp", e.target.value)}
              className="min-h-[200px]"
            />
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/campaigns">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Create Campaign
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}