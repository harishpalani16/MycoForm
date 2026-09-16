import {MousePointer2,Sprout,Droplets,Wind,Scissors} from 'lucide-react';

// The cultivation tools, in rail order. Shared by the left rail nav and the
// wide-view tool picker so the two can never drift apart.
export const actions=[
 ['observe','Observe',MousePointer2],
 ['transform','Transform / select',MousePointer2],
 ['feed','Offer nutrients',Droplets],
 ['spore','Plant a spore',Sprout],
 ['clear','Protect open space',Wind],
 ['prune','Prune gently',Scissors],
] as const;
