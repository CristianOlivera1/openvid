// components/video-editor/AspectRatioSelect.tsx
import { 
    Select, 
    SelectContent, 
    SelectGroup, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Icon } from "@iconify/react";

export function AspectRatioSelect() {
    return (
        <Select defaultValue="auto">
            <SelectTrigger className="h-8 w-36 border-input bg-background px-3 text-sm font-medium border transition-none">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icon icon="mynaui:layout" width="16" className="shrink-0" />
                    <span className="truncate"><SelectValue placeholder="Dimensión" /></span>
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="16:9">16:9 YouTube</SelectItem>
                    <SelectItem value="9:16">9:16 TikTok</SelectItem>
                    <SelectItem value="1:1">1:1 Instagram</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
