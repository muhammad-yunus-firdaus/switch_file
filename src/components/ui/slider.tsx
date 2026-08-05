import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full cursor-pointer", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none cursor-pointer data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="group/track relative grow overflow-hidden rounded-full bg-muted select-none cursor-pointer transition-all duration-200 data-horizontal:h-1.5 data-horizontal:hover:h-2.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 data-vertical:hover:w-2.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-[#2563EB] select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-4 shrink-0 rounded-full border-2 border-[#2563EB] bg-white ring-[#2563EB]/20 transition-all duration-200 select-none cursor-pointer after:absolute after:-inset-3 hover:ring-4 hover:ring-[#2563EB]/25 hover:scale-110 focus-visible:ring-4 focus-visible:ring-[#2563EB]/30 focus-visible:outline-hidden active:scale-95 active:ring-4 active:ring-[#2563EB]/40 disabled:pointer-events-none disabled:opacity-50 shadow-sm"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }

